# IMPLEMENT — 2026-03-30 — Search Page: Gemini AI Reasoning + Empty Classroom Fix

## What Was Built

Two changes to the parent search experience:

### 1. Search page now calls Gemini for AI reasoning

`app/(parent)/search/page.tsx` previously called `matchTeachers()` (deterministic fallback)
directly. It now calls `rankGemini()` when the user is logged in and has provided date filters,
falling back to `matchTeachers()` if Gemini fails.

### 2. Fixed "Different classroom" shown for all teachers when no classroom selected

`lib/ai/match.ts` treated empty `child_classroom` the same as a non-matching classroom,
causing all teachers to display "Different classroom — less familiar with child."
When `child_classroom` is empty, all teachers now get rank 1 with neutral reasoning:
"Available during your requested dates."

## Files Changed

| File                            | Change                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/(parent)/search/page.tsx`  | Call `rankGemini()` when logged in + dates present; fallback to `matchTeachers()` on failure |
| `lib/ai/match.ts`               | Handle empty `child_classroom`: rank all equally with neutral reasoning                      |
| `__tests__/ai-matching.test.ts` | Add 2 tests for empty classroom behavior (RED → GREEN)                                       |

## Key Decisions

**`rankGemini()` directly, not `runMatch()`:** The search page is a passive browse
experience, not a formal match request. Skipping eval logging here avoids polluting
`match_evals` with every page load. Explicit `/api/match` calls remain for logged booking flows.

**Neutral reasoning when no classroom:** Showing "Different classroom" when the parent
hasn't specified a classroom is misleading. "Available during your requested dates" is
accurate and non-committal.

**Fallback chain:** Gemini fails (network/key error) → `matchTeachers()` → page still renders.
No error surfaces to the user.

## TDD Workflow

- Added 2 failing tests to `__tests__/ai-matching.test.ts` — confirmed RED (1 failed)
- Fixed `lib/ai/match.ts` — confirmed GREEN (115/115 passed)

## Test Results

```
Tests  115 passed | 11 skipped (126)
Lint   0 errors, 6 warnings (all pre-existing)
```
