# IMPLEMENT 2026-04-19 — PR #41 Next.js audit bump

## What

Bumped Next.js `16.2.0 → 16.2.4` (and `eslint-config-next` to match) on the `feature/demo-docs` branch to unblock PR #41's `npm audit --audit-level=high` CI gate.

## Why

PR #41 (docs-only: demo script, blog post, reflection) was mergeable in content but BLOCKED by a failing `npm audit (Dependency Scanning)` check.

Root cause: PR #42's audit fix bumped Next to 16.2.0, but advisory [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) (Next.js DoS with Server Components, **HIGH**) covers `16.0.0-beta.0 – 16.2.2`. 16.2.0 is still in the vulnerable range, so the fix was incomplete. Every feature branch inherits the failure from main.

User chose to bundle the real fix into PR #41 rather than open a separate PR.

## Key decisions

- **Bump to `16.2.4`** (latest in 16.2.x, two patches past the fix baseline of 16.2.3) — same-minor, low-risk, no API/config breaks.
- **Also bumped `eslint-config-next`** to keep dev/prod Next-family versions aligned (prevents type-drift warnings).
- **Did not run `npm audit fix --force`** — that would take `@anthropic-ai/sdk` 0.79 → 0.90 (major, breaking) which deserves its own PR. The remaining advisory is `moderate`, below the CI `--audit-level=high` gate, so non-blocking.
- **Staged only `package.json` + `package-lock.json`** — untracked files (`.mcp.json`, `.tmp-issues/`, `docs/session-log-2026-03-19.md`) deliberately left out.

## Pre-push checklist

- `npm audit --audit-level=high --omit=dev` — EXIT=0 (only the expected moderate Anthropic SDK advisory remains)
- `npm run lint` — 0 errors (19 pre-existing warnings, unchanged)
- `npm run test` — 386 passed, 11 skipped
- `npm run build` — succeeded
- Agent review — "ship it"; lockfile diff is 51/51 symmetric, only Next-family + one transitive `picomatch` patch

## PR state changes in this session

1. Retargeted PR #41's base from `chore/prettier-format` → `main` (PR #40, its stacked base, had already merged).
2. Called `update_pull_request_branch` to merge latest main into `feature/demo-docs`.
3. Pushed this commit on top to fully patch the advisory.

## Next steps

- Confirm CI green on the new head SHA.
- Merge PR #41.
- Follow-up: open a separate PR to bump `@anthropic-ai/sdk` 0.79 → 0.90 with verification against `lib/ai/gemini.ts` and `lib/ai/match.ts` (known breaking; was explicitly scoped out of #42).

## Addendum — demo-script.md accuracy fix

User ran through the demo manually and flagged two inaccuracies in `docs/demo-script.md` Section 2c (parent flow):

1. Script said _"Clicking 'AI Match'"_ — there is no button. AI ranking auto-triggers via `useEffect` in `SearchClient.tsx:369-430` once `parentId`, both dates, and at least one teacher are present.
2. Script claimed an _"AI is ranking your matches…"_ banner would be visible. In practice the fetch resolves too fast for the banner to be noticed in a demo (especially when Gemini falls back to the deterministic `matchTeachers()`).

What _is_ reliably visible post-fetch (confirmed by user):

- `#1 Match` / `#2 Match` badge in the top-right corner of each teacher photo (`SearchClient.tsx:241-256`)
- "AI Match Reasoning" box under each bio (`SearchClient.tsx:287-305`)

Rewrote the Section 2c narration + stage directions to describe those two durable artifacts only.
