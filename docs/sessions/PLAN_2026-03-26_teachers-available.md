# PLAN — GET /api/teachers/available (Issue #11)

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis
**References:** `docs/sessions/EXPLORE_2026-03-26_teachers-available.md`

---

## Requirements (from issue #11)

**Supabase query:**
- Join `teachers → availability` where `availability.start_date <= start_date AND availability.end_date >= end_date AND availability.is_booked = false`
- Optional filter: `teachers.classroom ILIKE %classroom%`
- Optional filter: teacher name partial match

**Redis caching:**
- Cache key: `avail:{start_date}:{end_date}:{classroom}:{name}`
- TTL: 5 minutes
- Cache-first; bypass (fail open) if Redis unavailable

**Acceptance criteria:**
1. Returns matching teachers with availability array
2. `classroom` and `name` filters applied when provided
3. Results cached in Redis for 5 minutes with correct key
4. Cache bypassed (not crash) if Redis is down
5. 400 for missing `start_date` or `end_date`
6. 401 for unauthenticated requests
7. Unit tests: filter logic + cache hit/miss (mock Redis + Supabase)

---

## Implementation Plan

### Step 1 — Fix `lib/redis/client.ts` cache key prefix
Change `buildCacheKey` from `teachers:available:{...}` → `avail:{...}` to match issue spec and existing test.

### Step 2 — TDD RED: Expand `__tests__/api-teachers-available.test.ts`
Write all missing tests **before** implementation. Run to confirm RED.

Tests to add (mock `lib/redis/client` and `lib/supabase/server`):

**`getAvailableTeachers` unit tests:**
- Cache hit: returns parsed Redis data, Supabase not called
- Cache miss: calls Supabase, stores result in Redis, returns teachers
- Classroom filter: Supabase query includes ilike filter when `classroom` provided
- Name filter: Supabase query includes ilike filter when `name` provided
- Redis fail-open (get): Redis.get throws → skips cache, queries Supabase, no crash
- Redis fail-open (set): Redis.set throws after successful DB query → still returns teachers, no crash
- Supabase error: throws AppError with 500
- Cache key includes all 4 params

**Route handler tests (`app/api/teachers/available/route.ts`):**
- 400 when `start_date` missing
- 400 when `end_date` missing
- 400 when `end_date` before `start_date`
- 401 when unauthenticated (middleware-level — mark as integration note)
- 200 with valid params + parent role → calls `getAvailableTeachers`

### Step 3 — Update `lib/api/teachers-available.ts`

Replace the stub with:

```typescript
import { buildCacheKey, redis, CACHE_TTL_SECONDS } from "@/lib/redis/client";
import { createServerClient } from "@/lib/supabase/server";
import type { TeacherWithAvailability } from "@/types";

export async function getAvailableTeachers(query: TeachersAvailableQuery): Promise<{ teachers: TeacherWithAvailability[] }> {
  const cacheKey = buildCacheKey(query);

  // 1. Cache-first: try Redis (fail open on error)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable — proceed to DB
  }

  // 2. Supabase query
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("teachers")
    .select(`
      id, user_id, classroom, bio, created_at,
      profiles!inner (email),
      availability!inner (start_date, end_date)
    `)
    .lte("availability.start_date", query.start_date)
    .gte("availability.end_date", query.end_date)
    .eq("availability.is_booked", false)
    // optional filters applied conditionally

  if (error) throw errors.internal();  // never leak DB errors

  // 3. Shape response
  const teachers: TeacherWithAvailability[] = data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    classroom: row.classroom,
    bio: row.bio,
    created_at: row.created_at,
    name: (row.profiles as { email: string }).email,
    availability: row.availability as Pick<Availability, "start_date" | "end_date">[],
  }));

  const result = { teachers };

  // 4. Cache result (fail open on error)
  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable — return result anyway
  }

  return result;
}
```

**Classroom filter:** `.ilike("classroom", `%${query.classroom}%`)` if provided
**Name filter:** `.ilike("profiles.email", `%${query.name}%`)` if provided (email-as-name limitation)

### Step 4 — Create `app/api/teachers/available/route.ts`

```typescript
export const GET = withApiHandler(async (req: Request) => {
  // Auth: check user is authenticated + parent role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  // Parse + validate query params
  const { searchParams } = new URL(req.url);
  const query = teachersAvailableQuerySchema.parse({
    start_date: searchParams.get("start_date") ?? undefined,
    end_date: searchParams.get("end_date") ?? undefined,
    classroom: searchParams.get("classroom") ?? undefined,
    name: searchParams.get("name") ?? undefined,
  });

  const result = await getAvailableTeachers(query);
  return NextResponse.json(result);
});
```

### Step 5 — GREEN: Run tests, confirm all pass

### Step 6 — REFACTOR: Clean up if needed

---

## Files Modified / Created

| File | Action |
|------|--------|
| `lib/redis/client.ts` | Update `buildCacheKey` prefix |
| `__tests__/api-teachers-available.test.ts` | Expand to full test suite |
| `lib/api/teachers-available.ts` | Replace stub with real implementation |
| `app/api/teachers/available/route.ts` | Create new route handler |

---

## Risks & Notes

- **Name field gap**: `profiles` has only `email`, not a full name. Using email as `name` is a known limitation. A future migration should add `name` to `profiles` or `teachers`.
- **Supabase nested filter syntax**: `availability.start_date` dot-notation with `!inner` join is required for filtering on related table columns.
- **Role check**: middleware only enforces role for page routes, not API routes. Route must explicitly check `role === "parent"`.
- **Cache invalidation**: not in scope for this issue. Cache will expire after 5 min TTL naturally.

---

## TDD Commit Convention

- `test(RED): #11 add failing tests for teachers available`
- `feat(GREEN): #11 implement Supabase query + Redis caching`
- `refactor(REFACTOR): #11 ...` (if needed)
