# IMPLEMENT — GET /api/teachers/available (Issue #11)

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis
**References:** EXPLORE + PLAN docs in same date

---

## What Was Built

### Files Modified

| File                                       | Change                                                         |
| ------------------------------------------ | -------------------------------------------------------------- |
| `lib/redis/client.ts`                      | Fixed `buildCacheKey` prefix: `teachers:available:` → `avail:` |
| `lib/api/teachers-available.ts`            | Replaced stub with real Supabase query + Redis caching         |
| `__tests__/api-teachers-available.test.ts` | Expanded from 1 test to 21 (full acceptance coverage)          |

### Files Created

| File                                                     | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `app/api/teachers/available/route.ts`                    | GET route handler with auth + Zod validation |
| `docs/sessions/EXPLORE_2026-03-26_teachers-available.md` | Exploration findings                         |
| `docs/sessions/PLAN_2026-03-26_teachers-available.md`    | Implementation plan                          |

---

## TDD Flow

**RED:** Added all 21 tests before implementation. Tests failed due to missing route file and stub Supabase query.

**GREEN:** Implemented in two files:

1. `lib/api/teachers-available.ts` — real Supabase join + Redis cache-first with fail-open
2. `app/api/teachers/available/route.ts` — GET handler wrapped in `withApiHandler`

All 21 tests pass; 36 total passing across suite.

---

## Key Decisions

### Test architecture

Initial design mocked `getAvailableTeachers` for route tests using a `vi.mock` factory. This caused Vitest's hoisting to override the real function in unit tests. Fixed by removing the function mock and instead using Redis cache-hit to bypass the DB query in route tests — both layers tested through the same mock infrastructure.

### Name field

`teachers` table has no `name` column. Joined `profiles!inner` to get `profiles.email` and used it as `name`. This is a known limitation; a future migration should add `name` to `profiles` or `teachers`.

### Auth strategy

Route calls `createServerClient().auth.getUser()` explicitly to check `parent` role. Middleware already handles 401 for unauthenticated requests at the edge, but role enforcement (parent-only) must be done in the route.

### Redis fail-open

Both `redis.get` and `redis.set` are wrapped in `try/catch`. Any Redis error is silently swallowed and the DB path is taken instead. This prevents Redis downtime from breaking the API.

---

## Test Results

```
Test Files  1 passed (1)
Tests       21 passed (21)
```

Full suite: 36 passed, 11 skipped, 1 pre-existing failure in `api-error-formatting.test.ts` (missing `vi.mock("@sentry/nextjs")` — not in scope for this issue, existed on main before this branch).

---

## Next Recommendations

- Fix `api-error-formatting.test.ts` (add Sentry mock — separate issue)
- Add migration to add `name` column to `profiles` table for full-name support
- Add E2E test for the full search → AI rank flow
