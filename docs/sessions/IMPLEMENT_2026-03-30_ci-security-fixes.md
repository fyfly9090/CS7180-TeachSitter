# IMPLEMENT — CI & Security Fixes

**Date:** 2026-03-30
**Branch:** `feature/parent-search-ui`

---

## What Was Built

Three rounds of CI failures were diagnosed and fixed, plus local tooling was hardened to catch similar issues before they reach GitHub.

---

## Problems Diagnosed & Fixed

### Round 1 — Pre-push hook blocked by ESLint (2953 problems)

**Root cause:** `playwright-report/` directory was committed to git (24 minified JS files). ESLint scanned them and produced 149 errors + 2804 warnings.

**Fix:**

- Added `playwright-report/`, `test-results/`, `e2e/auth-state.json`, `e2e/screenshots/` to `.gitignore`
- Ran `git rm -r --cached playwright-report/` to untrack committed artifacts
- Added `{ ignores: ["playwright-report/**", "test-results/**"] }` to `eslint.config.mjs`

**Lesson:** Files that exist in git before a `.gitignore` entry is added stay tracked. Must `git rm --cached` explicitly.

---

### Round 2 — CI failures: lint, build, CodeQL, Snyk

**Problem A — Prettier (7 files):** CI `prettier --check` failed.

Root cause: The pre-push hook was running `prettier --write . && git add -u` — this fixed files locally and staged them, but **never committed them**. `git push` only sends committed code. CI received the unformatted version every time.

**Fix:** Redesigned the hook pipeline:

- **pre-commit:** `lint-staged` runs `prettier --write` + `eslint` on staged files only → formatting is baked into every commit
- **pre-push:** `prettier --check` (fail fast, no silent fix) + `eslint .` + `npm run test`

**Problem B — Next.js build failure:** `useSearchParams() should be wrapped in a suspense boundary at page "/bookings/new"`.

Fix: Extracted component body into `NewBookingContent`, wrapped in `<Suspense>` in the default export. This is required for any page that calls `useSearchParams()` in Next.js App Router.

**Problem C — CodeQL "Error when processing SARIF":** Downstream of the build failure — CodeQL runs `npm run build` internally; a failed build produces no valid SARIF output.

Fix: Resolved implicitly by fixing the build.

**Problem D — Snyk: `brace-expansion@5.0.4` High severity (SNYK-JS-BRACEEXPANSION-15789759):**
Transitive dependency via `@sentry/nextjs → @sentry/bundler-plugin-core → glob → minimatch → brace-expansion@5.0.4`.

Fix: Added to `package.json`:

```json
"overrides": {
  "brace-expansion@5.0.4": "5.0.5"
}
```

Note: `"brace-expansion": ">=5.0.5"` was too broad (broke packages needing 1.x/2.x). `"brace-expansion@5.0.4": "5.0.5"` is the correct scoped override syntax.

**Problem E — Snyk 403 Forbidden:** `SNYK_TOKEN` GitHub Actions secret was expired. Cannot be fixed in code — requires regenerating token at snyk.io and updating the repo secret.

---

### Round 3 — CodeQL: DOM text reinterpreted as HTML (High)

**Finding:** `js/xss-through-dom` at `SearchClient.tsx:298` — `href={bookingHref}` where `dateFrom`/`dateTo` from `<input type="date">` were embedded in the URL without `encodeURIComponent`.

**Analysis:** Not a real exploitable vulnerability:

- `bookingHref` always starts with hardcoded `/bookings/new?` — cannot become a `javascript:` URL
- `<input type="date">` only produces valid `YYYY-MM-DD` strings
- React's `Link` component does not use `innerHTML`

**Correct approach:** Fix the code (add `encodeURIComponent` to all URL params), not dismiss the alert. Dismissing signals "known issue, won't fix" — here there was a real code quality defect worth correcting.

```ts
// Before
(dateFrom ? `&start_date=${dateFrom}` : "")(
  // After
  dateFrom ? `&start_date=${encodeURIComponent(dateFrom)}` : ""
);
```

---

## Tooling Added

### `eslint-plugin-security`

Added to `eslint.config.mjs` with rules:

| Rule                             | Level | Catches                                |
| -------------------------------- | ----- | -------------------------------------- |
| `detect-non-literal-fs-filename` | error | Path traversal via dynamic filenames   |
| `detect-non-literal-regexp`      | error | ReDoS via dynamic regex                |
| `detect-unsafe-regex`            | error | ReDoS via catastrophic backtracking    |
| `detect-object-injection`        | warn  | Prototype pollution via bracket access |
| `detect-possible-timing-attacks` | warn  | Timing side-channels in comparisons    |

These run at **pre-commit time** via lint-staged. They do not replace CodeQL — they cover single-file pattern matching; CodeQL does cross-file taint analysis which requires building a full dataflow graph.

### `lint-staged`

Configured in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,mjs}": ["prettier --write", "eslint"],
  "*.{json,css,md,cjs}": "prettier --write"
}
```

### Hook pipeline (final state)

```
git commit
  └─ .husky/pre-commit → lint-staged
       ├─ prettier --write   (formats staged files)
       └─ eslint             (security + lint errors block commit)

git push
  └─ .husky/pre-push
       ├─ prettier --check   (verifies committed code is formatted)
       ├─ eslint .           (full project lint)
       └─ npm run test       (all unit tests)

GitHub CI
  ├─ ci.yml      lint → test → build
  ├─ security.yml  CodeQL (deep taint analysis) + Snyk (dependency audit)
  └─ deploy.yml  Vercel (on merge to main)
```

---

## Git History

```
f1ce4cf feat(ci): add eslint-plugin-security for local pre-commit security scanning
6f91bfe fix(search): encodeURIComponent all bookingHref params
81f3634 fix(ci): commit formatted files and fix pre-push hook design
e05e705 fix(ci): resolve lint, build, and security failures
```

---

## Next Recommendations

- **Snyk token:** Regenerate at snyk.io → update `SNYK_TOKEN` secret in GitHub repo Settings → Secrets → Actions
- **`detect-object-injection` false positives:** Two warnings (`SearchClient.tsx:52`, `api-bookings.test.ts:111`) are array index lookups flagged by the rule. Can suppress with `// eslint-disable-next-line security/detect-object-injection` if they cause noise
- **CodeQL coverage:** The local `eslint-plugin-security` does not replicate CodeQL's cross-file taint analysis. CodeQL in CI remains the authoritative SAST gate
