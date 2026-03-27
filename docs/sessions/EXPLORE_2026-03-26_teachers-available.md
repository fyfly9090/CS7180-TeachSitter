# EXPLORE — GET /api/teachers/available (Issue #11)

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis

---

## Files Examined

| File | Status |
|------|--------|
| `lib/api/teachers-available.ts` | Stub — Supabase query returns `[]`, wrong cache key |
| `__tests__/api-teachers-available.test.ts` | 1 test only (cache hit), all AC tests missing |
| `lib/redis/client.ts` | Full client + `buildCacheKey` with mismatched prefix |
| `lib/validations/index.ts` | `teachersAvailableQuerySchema` already defined ✓ |
| `types/index.ts` | `TeacherWithAvailability` type defined ✓ |
| `lib/errors.ts` | `withApiHandler` + `errors.*` helpers ✓ |
| `lib/supabase/server.ts` | `createServerClient()` for API routes ✓ |
| `middleware.ts` | Returns 401 for unauthenticated API calls automatically |
| `app/api/teachers/available/route.ts` | **Does not exist** — must be created |
| `supabase/seed.sql` | Seed data examined for schema understanding |

---

## Key Findings

### 1. Cache Key Discrepancy
Three different formats in play — must align to issue spec:

| Location | Format |
|----------|--------|
| Issue #11 spec | `avail:{start}:{end}:{classroom}:{name}` |
| `lib/redis/client.ts` `buildCacheKey` | `teachers:available:{start}:{end}:{classroom}:{name}` |
| `lib/api/teachers-available.ts` `buildCacheKey` | `avail:{start}:{end}` (missing classroom + name) |
| Existing test | `avail:2026-06-16:2026-06-20` (no classroom/name) |

**Decision:** Adopt `avail:{start}:{end}:{classroom}:{name}` per issue spec. Update `lib/redis/client.ts` prefix. Delete local `buildCacheKey` in stub, import from redis client.

### 2. Teacher `name` Field Gap
The `teachers` DB table has no `name` column. `profiles` only has `email`. Yet `TeacherWithAvailability` requires `name: string`, and the API docs show `"name": "Tara Smith"`.

**Decision:** Join `teachers → profiles` via `user_id`; use `profiles.email` as the `name` field. This is the only identifier available without a schema change. Note: a proper `name` column on `profiles` or `teachers` would be needed for full-name support.

### 3. Existing Test Gaps
The single existing test covers only the cache-hit path with old (incorrect) cache key format. All acceptance criteria are untested:
- Cache miss → Supabase query
- `classroom` filter
- `name` filter
- Redis fail-open (bypass if Redis down)
- 400 for missing `start_date` / `end_date`
- 401 for unauthenticated (middleware — route-level test)

### 4. Auth Strategy
`middleware.ts` already returns 401 for all unauthenticated API requests. The route does **not** need its own auth check for unauthenticated users. However, it should verify the user role is `parent` (middleware doesn't enforce role at API level — only for page routes).

### 5. No Route File Exists
`app/api/teachers/available/route.ts` must be created. Pattern from existing routes (`login`, `signup`): wrap handler in `withApiHandler`, parse query params with Zod schema, call lib function.

### 6. Supabase Query Shape
Query: `teachers` joined with `availability!inner` (filter on nested) and `profiles!inner` (for name/email).
Filters on joined table via dot notation (`availability.start_date`, `availability.end_date`, `availability.is_booked`).

---

## What Needs Building

1. **Fix** `lib/redis/client.ts` — update `buildCacheKey` prefix from `teachers:available` → `avail`
2. **Expand** `__tests__/api-teachers-available.test.ts` — add all missing AC tests (TDD RED)
3. **Replace** `lib/api/teachers-available.ts` stub — real Supabase query + Redis fail-open
4. **Create** `app/api/teachers/available/route.ts` — GET handler with Zod validation + role check

---

## Next Steps

→ Write PLAN doc → implement TDD (RED → GREEN → REFACTOR)
