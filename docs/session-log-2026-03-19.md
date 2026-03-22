# Session Log — 2026-03-19

**Project:** TeachSitter (CS7180-TeachSitter)
**Session Goal:** Set up Claude Code configuration for the TeachSitter project — CLAUDE.md and permissions allowlist.

---

## 1. /init — Initial CLAUDE.md Generation

### Context at Start

The repository was in pre-development state: no source code, no `package.json`, no config files. Only existing files were `docs/PRD.md`, `LICENSE`, `README.md` (title only), and a pre-existing `CLAUDE.md` (project spec written by the user).

### What /init Did

- Explored the codebase to understand project state and existing documentation
- Identified the existing `CLAUDE.md` as a comprehensive project spec, but missing the required Claude Code prefix and a Commands section
- Generated an improved `CLAUDE.md` with:
  - Standard Claude Code prefix (`# CLAUDE.md` + guidance line)
  - New **Commands** section with all dev scripts
  - Preserved all project-specific content from the original
  - Consolidated redundant Security and Testing sections
  - Fixed a confusing auth entry (moved "use email+password" from Don'ts to Do's)
  - Removed `@docs/API.md` reference (file not yet created; user later removed it)

---

## 2. CLAUDE.md Iterations

### Iteration 1 — /init output (baseline)

**Changes from original:**

- Added `# CLAUDE.md` prefix with Claude Code guidance line
- Added Commands section:
  ```bash
  npm run dev, build, lint, test, test:watch, test:e2e, test:coverage
  npm run test -- path/to/file.test.ts  # single file
  ```
- Removed separate Security section (merged into Do's/Don'ts)
- Removed separate Testing Strategy section (merged into Conventions)
- Fixed auth Do/Don't wording
- Removed `@docs/API.md` from Additional Context (file doesn't exist yet)

### Iteration 2 — PRD.md alignment check

**Trigger:** User asked to verify CLAUDE.md against `docs/PRD.md`.

**Finding:** One discrepancy — CLAUDE.md listed `experience` as an AI Matching secondary signal, but PRD.md only specifies `availability overlap` and `profile completeness`.

**Change:**

```diff
- Secondary signals: availability overlap, experience, profile completeness
+ Secondary signals: availability overlap, profile completeness
```

### Iteration 3 — Testing section expansion

**Trigger:** User requested more explicit testing format in the Conventions section.

**Change:** Expanded the single-line testing blurb into a bullet list:

```markdown
**Testing:**

- Vitest for unit/integration (colocate as `.test.ts`), Playwright for E2E
- TDD: write tests before implementation
- Mock Supabase and AI API calls — no real network calls in tests
- Coverage target: >80%
```

### Iteration 4 — Redis-cached API annotation

**Trigger:** User asked to mark Redis-cached routes in the API Routes table.

**Change:** Added `(Redis-cached)` to the one applicable route:

```diff
- | GET | /api/teachers/available | Search available teachers by date + classroom |
+ | GET | /api/teachers/available | Search available teachers by date + classroom (Redis-cached) |
```

---

## 3. Final CLAUDE.md

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Verification

⭐ Any conversation you want to communicate with me, start it with a star emoji (⭐).

## Additional Context

@docs/PRD.md

## Project Overview

TeachSitter is a preschool childcare marketplace that connects parents with their school's teachers
for babysitting during school breaks. Teachers post availability, parents search and book, and AI
ranks matches by classroom familiarity.

## Commands

npm run dev # Start development server
npm run build # Production build
npm run lint # ESLint + Prettier check — run before any PR
npm run test # Vitest unit/integration tests — run before any PR
npm run test:watch # Vitest in watch mode
npm run test -- path/to/file.test.ts # Run a single test file
npm run test:e2e # Playwright E2E tests
npm run test:coverage # Coverage report (target >80%)

## Tech Stack

Frontend: Next.js 15+ (App Router), React 19, Tailwind CSS v4, Shadcn UI
Backend: Node.js via Next.js API Routes
DB & Auth: Supabase (PostgreSQL, RLS, Email + Password Auth)
Caching: Redis
AI/Matching: Gemini 1.5 Pro / Claude 3.5 Sonnet (Parallel Agents)
Linting: ESLint, Prettier
Testing: Vitest + Playwright

## Architecture Decisions

- Monolith-first: all API routes in Next.js /app/api
- Supabase as single source of truth — no ORM or raw SQL
- RLS enforced from day one — no prototyping without it
- AI calls server-side only — always through /api/match
- Redis for caching /api/teachers/available only
- /api/match runs Gemini + Claude in parallel, logs all to match_evals

## API Routes (key)

GET /api/teachers/available — Search teachers (Redis-cached)
POST /api/match — AI ranking
POST /api/bookings — Parent creates booking
PATCH /api/bookings/[id] — Teacher confirms/declines
GET /api/evals — Match eval metrics

## Testing

- Vitest for unit/integration (colocate as .test.ts), Playwright for E2E
- TDD: write tests before implementation
- Mock Supabase and AI API calls — no real network calls in tests
- Coverage target: >80%

## Do's

- Use Shadcn UI before custom UI
- Log all AI match I/O to match_evals
- Cache /api/teachers/available with Redis
- Use Zod schemas as single source of truth for input shapes
- Use email + password auth — not magic link or OAuth

## Don'ts

- Call AI APIs from the client
- Skip RLS when prototyping
- Use `any` TypeScript type
- Add deps without checking Shadcn/Supabase first
- Disable ESLint rules inline without a comment
- Expose internal error messages to the client
```

---

## 4. Permissions Configuration

**File:** `.claude/settings.json`

### Allowlist (no prompt required)

| Category     | Rules                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| npm scripts  | `npm run dev/build/lint/test/test:watch/test:e2e/test:coverage`                                                      |
| npm install  | `npm install`, `npm install *`                                                                                       |
| Shadcn UI    | `npx shadcn@latest add *`, `npx shadcn@latest init`                                                                  |
| Supabase CLI | `npx supabase *`                                                                                                     |
| Playwright   | `npx playwright *`                                                                                                   |
| Git (safe)   | `git status`, `git diff *`, `git log *`, `git add *`, `git commit *`, `git checkout *`, `git branch *`, `git pull *` |

### Ask before running

| Rule           | Reason                                                      |
| -------------- | ----------------------------------------------------------- |
| `Bash(curl *)` | External network requests — confirm intent before executing |

### Denied (always blocked)

| Rule             | Reason                         |
| ---------------- | ------------------------------ |
| `Bash(rm -rf *)` | Destructive recursive deletion |
| `Bash(wget *)`   | Direct network downloads       |

### Notable exclusions

- `git push` — **not** in the allowlist; always prompts for confirmation before pushing to remote

### Final `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev)",
      "Bash(npm run build)",
      "Bash(npm run lint)",
      "Bash(npm run test)",
      "Bash(npm run test:watch)",
      "Bash(npm run test:e2e)",
      "Bash(npm run test:coverage)",
      "Bash(npm run test -- *)",
      "Bash(npm install)",
      "Bash(npm install *)",
      "Bash(npx shadcn@latest add *)",
      "Bash(npx shadcn@latest init)",
      "Bash(npx supabase *)",
      "Bash(npx playwright *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git checkout *)",
      "Bash(git branch *)",
      "Bash(git pull *)"
    ],
    "deny": ["Bash(rm -rf *)", "Bash(wget *)"]
  }
}
```

---

## 5. Context Management

### `/compact` — Context Compression

**When used:** End of session, after session log was generated.

**What it did:**

- Compressed the full conversation history into a structured summary
- Preserved all key decisions, file states, diffs, and pending tasks
- Freed context window space for future continuation

**Summary stored:** Covers all 8 topics — primary request, technical concepts, file states, errors/fixes, problem solving, full user message history, pending tasks, and current work state.

**Pending item flagged in summary:** Verify that `"ask": ["Bash(curl *)"]` is correctly persisted in `.claude/settings.json` — the section did not appear in the file read during session log generation despite the edit reporting success.

### `--continue` — Session Resume After Compaction

**When used:** After `/compact`, to resume the conversation with the compacted summary loaded as context.

**What it did:**

- Reloaded the conversation using the compressed summary as context (not the full transcript)
- Allowed the session to continue seamlessly from where it left off
- Resolved the pending item from the summary: confirmed `"ask": ["Bash(curl *)"]` was missing from `.claude/settings.json` and added it

**Strategy:** `/compact` + `--continue` together form a two-step context management pattern — compress first, then resume. This keeps the context window lean while preserving continuity across long sessions.

---

## 6. Files Created / Modified

| File                             | Action   | Notes                                                |
| -------------------------------- | -------- | ---------------------------------------------------- |
| `CLAUDE.md`                      | Modified | Added prefix, Commands, fixed iterations (see above) |
| `.claude/settings.json`          | Created  | Preliminary allowlist for project tooling            |
| `docs/session-log-2026-03-19.md` | Created  | This file                                            |
