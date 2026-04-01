# IMPLEMENT: Issue #7 — Teacher Availability Management API

**Date:** 2026-03-31
**Branch:** feature/7-teacher-availability-api
**Issue:** [fyfly9090/CS7180-TeachSitter#7](https://github.com/fyfly9090/CS7180-TeachSitter/issues/7)

---

## What Was Built

Three new API endpoints for teacher availability CRUD (PATCH already existed from #6):

- `GET /api/teachers/[id]` — any authenticated user reads teacher profile + availability (RLS filters visibility)
- `POST /api/teachers/[id]/availability` — teacher adds a single availability block (201)
- `DELETE /api/teachers/[id]/availability/[avail_id]` — teacher removes an unbooked block (204); booked blocks return 409

### New files

- `app/api/teachers/[id]/availability/route.ts` — POST handler
- `app/api/teachers/[id]/availability/[avail_id]/route.ts` — DELETE handler
- `__tests__/api-teacher-availability.test.ts` — 25 tests covering all 3 endpoints

### Modified files

- `app/api/teachers/[id]/route.ts` — added GET export
- `lib/validations/index.ts` — added `uuidParamSchema` for path param validation
- `docs/API.md` — documented all 4 teacher endpoints

---

## Key Decisions

1. **GET is role-agnostic** — any authenticated user (parent or teacher) can read any teacher's profile. RLS automatically filters availability: parents see unbooked only, owner sees all.
2. **UUID path validation** — both `id` and `avail_id` are validated with `z.string().uuid()` for consistent 400 errors on malformed IDs.
3. **409 for booked blocks** — DELETE checks `is_booked` at the application layer before deleting. RLS provides backup protection.
4. **No overlap validation** — multiple availability blocks with overlapping dates are allowed (per plan decision).
5. **Nested route params** — `[id]/availability/[avail_id]` yields `ctx.params` as `Promise<{ id: string; avail_id: string }>`.

---

## Test Results

```
Tests: 206 passed | 11 skipped (pre-existing RLS smoke tests)
New:   25 tests in api-teacher-availability.test.ts
Lint:  0 errors
```

---

## Next Recommendations

- Frontend integration: wire the teacher setup page's availability blocks to POST/DELETE instead of the bulk PATCH replacement
- Consider overlap validation as a follow-up if product requires it
