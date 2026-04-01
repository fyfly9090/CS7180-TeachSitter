# IMPLEMENT — PATCH /api/bookings/[id] fixes (Issue #9)

**Date:** 2026-03-31
**Branch:** `feature/9-patch-bookings`
**Issue:** #9 — PATCH /api/bookings/[id] — teacher confirm or decline

---

## What Was Built

Fixed critical and medium issues identified during code review of the PATCH /api/bookings/[id] endpoint.

### Changes

**`app/api/bookings/[id]/route.ts`**
- Added `availability.is_booked = true` side effect when booking is confirmed (prevents double-booking)
- Added 409 CONFLICT guard for non-pending bookings (already confirmed/declined cannot be changed)
- Cleaned up type assertions — replaced inline casts with `typedBooking`/`typedTeacher` locals
- Added `start_date, end_date` to booking select for availability lookup

**`__tests__/api-bookings.test.ts`**
- Added test: 404 when teacher profile does not exist
- Added test: 409 when booking is already confirmed
- Added test: 409 when booking is already declined
- Added test: verifies `availability.update({ is_booked: true })` called on confirm
- Added test: verifies no availability update on decline

---

## Key Decisions

1. **Only pending bookings can transition** — confirmed/declined are terminal states. Simplifies logic and prevents inconsistent `is_booked` flags.
2. **Availability update uses date range matching** — `lte("start_date", bookingStart)` + `gte("end_date", bookingEnd)` finds slots that fully cover the booking dates.
3. **No decline-after-confirm** — avoids needing to reset `is_booked = false` and complex state management.

---

## Test Results

All 24 tests passing in `__tests__/api-bookings.test.ts` (was 19 before fixes).

---

## Review

Agent review confirmed all acceptance criteria pass and all previously reported issues resolved. Verdict: ready to merge.
