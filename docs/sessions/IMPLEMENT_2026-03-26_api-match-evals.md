# IMPLEMENT — POST /api/match + GET /api/evals

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis

---

## What Was Built

### New Files

| File                          | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `lib/ai/gemini.ts`            | `rankTeachers()` via Gemini 1.5 Pro + JSON prompt             |
| `lib/ai/claude.ts`            | `rankTeachers()` + `judgeRanking()` via Claude 3.5 Sonnet     |
| `lib/api/match.ts`            | `runMatch()` — Promise.any() race + eval insert + async judge |
| `app/api/match/route.ts`      | POST handler: parent-auth, matchRequestSchema, runMatch()     |
| `app/api/evals/route.ts`      | GET handler: admin-auth, evalsQuerySchema, paginated query    |
| `__tests__/api-match.test.ts` | 13 tests: auth, validation, AI race, eval logging             |
| `__tests__/api-evals.test.ts` | 10 tests: auth, pagination, response shape, ordering          |

### Also Refactored (same branch)

| File                                   | Change                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `lib/api/teachers-available.ts`        | Replace scattered `as string` casts with `TeacherRow` interface       |
| `app/api/bookings/route.ts`            | Single destructure instead of 6-line repetitive BookingResponse cast  |
| `app/api/bookings/[id]/route.ts`       | Narrow verbose `Pick<Booking,...>` cast; drop unused imports          |
| `lib/api/bookings.ts`                  | **Deleted** — dead mock stub superseded by real route tests           |
| `__tests__/booking-validation.test.ts` | Remove "Booking Permissions" block (tested by real PATCH handler now) |

---

## Key Decisions

### AI Race Strategy

`Promise.any([rankGemini, rankClaude])` — first success wins. `AggregateError` (both fail) triggers deterministic `matchTeachers()` fallback. Always returns 200; never 502 when fallback is available.

### Judge as Fire-and-Forget

`void runJudge(...)` — judge never blocks the API response. All judge errors are caught silently; `judge_score` stays null until updated async.

### Admin Role Check

`user_metadata.role === "admin"` — not in signup schema (only parent/teacher), but route enforces it. Admin users must be manually set in Supabase.

### Prompt Security

`bio` capped at 2000 chars (already in `teacherInputSchema`) before passing to AI prompts — prompt injection guard from PRD.

---

## Git History

```
refactor(REFACTOR): POST /api/match + GET /api/evals — lint + formatting
feat(GREEN): implement POST /api/match + GET /api/evals
test(RED): POST /api/match + GET /api/evals — failing tests
refactor(REFACTOR): #11 remove scattered type assertions, delete dead booking stub
```

---

## Test Results

78 tests passing, 11 skipped (RLS smoke — require live DB env vars)

---

## Next Steps

- PR: merge `feature/11-teachers-available-supabase-redis` → `main`
- Frontend: parent search page + AI match display (reads `/api/match`)
- Frontend: teacher availability posting UI
- Frontend: booking flow (parent request + teacher confirm/decline)
- GET /api/evals admin dashboard page (metrics)
- Set `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in Vercel + GitHub Actions secrets
