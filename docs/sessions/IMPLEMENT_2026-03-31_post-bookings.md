# IMPLEMENT: POST /api/bookings — Issue #16

**Date:** 2026-03-31
**Branch:** `feature/16-post-bookings` (branched from `feature/14-ai-match-ui`)
**Issue:** #16 — POST /api/bookings — create booking request

---

## What Was Built

All work for this feature was already present on the parent branch (`feature/14-ai-match-ui`). This branch isolates and delivers it against issue #16.

### Files Delivered

| File                                   | Description                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `app/api/bookings/route.ts`            | POST handler — parent creates booking request        |
| `__tests__/api-bookings.test.ts`       | 19 unit tests (POST + PATCH handlers)                |
| `__tests__/booking-validation.test.ts` | fast-check property-based date validation tests      |
| `lib/validations/booking.ts`           | `validateBookingDates` helper used by property tests |

---

## Implementation Summary

### `POST /api/bookings`

1. **Auth** — `createServerClient()` → `auth.getUser()` → 401 if no user, 403 if not `parent` role
2. **Validation** — `createBookingSchema` (Zod): `teacher_id` (UUID), `start_date`, `end_date` (YYYY-MM-DD), optional `message` (≤500 chars), cross-field `end_date >= start_date`
3. **Conflict check** — queries `availability` table:
   - `.eq("teacher_id", ...)` `.eq("is_booked", false)` `.lte("start_date", ...)` `.gte("end_date", ...)`
   - Returns 409 `CONFLICT` if no slot covers the entire requested range
4. **Insert** — `bookings` table with `status: "pending"` (hardcoded, never from input)
5. **Response** — 201 with safe fields: `id, parent_id, teacher_id, start_date, end_date, status`

---

## Key Decisions

- **Overlap check via `lte`/`gte`:** Availability slot must fully contain the booking range (`avail.start_date ≤ booking.start_date` AND `avail.end_date ≥ booking.end_date`). Partial overlaps are rejected.
- **status always `"pending"`:** Input cannot set status; prevents parents from self-confirming.
- **Response omits `message` and `created_at`:** Leaks nothing beyond the booking identity and state.

---

## Test Results

```
npm run lint  →  0 errors (7 pre-existing warnings, unchanged)
npm run test  →  126 passed, 11 skipped (RLS smoke tests require live DB)

POST /api/bookings tests (19 total):
  - 401 unauthenticated
  - 403 teacher role (not parent)
  - 400 missing teacher_id / invalid UUID / missing start_date
  - 400 end_date before start_date
  - 400 message > 500 chars
  - 409 no availability covering dates
  - 201 success — booking.status === "pending"
  - 201 success — status is always pending regardless of input
  - 500/409 on Supabase insert error

fast-check property test:
  - ∀ (date1, date2) where start > end → validateBookingDates throws
```

---

## Acceptance Criteria — All Met

- [x] Returns 201 with new booking on success
- [x] Returns 400 for missing/invalid fields
- [x] Returns 401 for unauthenticated requests
- [x] Returns 409 if teacher has no availability covering the requested dates
- [x] `status` is always `pending` on creation
- [x] Unit tests cover conflict check, missing fields, unauthorized access
