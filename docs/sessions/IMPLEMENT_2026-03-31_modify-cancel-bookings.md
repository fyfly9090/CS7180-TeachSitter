# IMPLEMENT: Modify Booking + Cancel Booking

**Date:** 2026-03-31
**Branch:** feature/16-post-bookings
**Issue:** #17 (Parent Bookings page — status tracking UI)

---

## What Was Built

### 1. `updateBookingDatesSchema` — `lib/validations/index.ts`

New Zod schema for parent PATCH: `{ start_date, end_date, message? }` with shared `dateRangeRefinement`.

### 2. `PATCH /api/bookings/[id]` extended — `app/api/bookings/[id]/route.ts`

Handler now branches by role:

- **Teacher** → existing confirm/decline logic (unchanged)
- **Parent** → new dates-update branch:
  1. Validates body with `updateBookingDatesSchema`
  2. Fetches booking and verifies `parent_id === user.id`
  3. Checks teacher availability covers new dates (same logic as POST)
  4. Updates `start_date`, `end_date`, `status: "pending"`, `message`
  5. Returns 200 with updated booking

Existing test "returns 403 when user is a parent" updated → now expects 400 (parent sending `{ status }` hits Zod validation).

### 3. `DELETE /api/bookings/[id]` — `app/api/bookings/[id]/route.ts`

New handler for parent cancellation:

- Auth: parent only → 403 for teacher
- Fetches booking, verifies `parent_id` ownership
- Restricts to `status === "pending"` → 409 for confirmed
- Supabase `delete().eq()` → 204 on success

### 4. `BookingModifyModal` — `app/(parent)/bookings/page.tsx`

Inline modal component with `role="dialog" aria-labelledby="modify-modal-title"`:

- Pre-fills dates from current booking
- Labels: `htmlFor="modify-start-date"` / `"modify-end-date"` for test accessibility
- Submit calls `PATCH /api/bookings/{id}`
- On success: calls `onSuccess(id, startDate, endDate, message)` → parent updates state

### 5. `BookingCard` updated — `app/(parent)/bookings/page.tsx`

Added `onModify` and `onCancel` props. Confirmed bookings call `onModify`; pending bookings call `onCancel`.

### 6. `BookingsPage` state additions — `app/(parent)/bookings/page.tsx`

- `modifyTarget: BookingItem | null` — which booking's modal is open
- `handleCancel(id)` — fires DELETE, filters booking out of state on success
- `handleModifySuccess(id, startDate, endDate, message)` — updates booking in state, resets status to `"pending"`, closes modal

---

## Key Decisions

- **Single PATCH endpoint, role-based branching**: cleaner than a separate parent PATCH route. Teacher sends `{ status }`, parent sends `{ start_date, end_date }` — Zod catches wrong-body errors with 400.
- **Cancel restricted to pending only**: enforced server-side (409 for confirmed). UI only shows Cancel for pending bookings so this is belt-and-suspenders.
- **Optimistic-ish state update**: on PATCH/DELETE success, update local state immediately rather than re-fetching. Avoids an extra round-trip and keeps the UI snappy.
- **Modal pre-fills current dates**: parent can confirm without re-entering unchanged dates.

---

## Test Results

```
Tests  191 passed | 11 skipped   (41 API + 29 page + 121 other)
Lint   0 errors, 10 warnings (pre-existing security/detect-object-injection in seed scripts)
```

New tests added:

- **`__tests__/api-bookings.test.ts`**: +13 tests (6 parent PATCH + 7 DELETE)
- **`app/(parent)/bookings/page.test.tsx`**: +8 tests (6 modal + 2 cancel)

---

## Git History (this session)

- `feat(GREEN): #17 parent PATCH dates + DELETE cancel + Modify Booking modal`

---

## Next Recommendations

- Teacher-side: PATCH `/api/bookings/[id]` confirm/decline UI on teacher dashboard
- Email notifications on booking status change (Could Have in PRD)
- E2E test: full modify + cancel flow with Playwright
