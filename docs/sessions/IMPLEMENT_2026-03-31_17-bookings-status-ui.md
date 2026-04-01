# IMPLEMENT: #17 Parent Bookings Page — Status Tracking UI

**Date:** 2026-03-31
**Branch:** `feature/17-bookings-status-ui`
**Issue:** #17

---

## What Was Built

### 1. `GET /api/bookings` (added to `app/api/bookings/route.ts`)

- Auth-gated: parent role only (401/403 on fail)
- Queries `bookings` joined with `teachers(full_name, classroom)` for the authenticated parent
- Flattens nested teacher join into `teacher_name` + `teacher_classroom` on each booking
- Orders by `created_at DESC`
- Returns `{ bookings: [...] }`

### 2. `app/(parent)/bookings/page.tsx` — full rewrite

- Replaced hardcoded `pastSessions[]` and static counts with real API fetch
- `useEffect` calls `GET /api/bookings` on mount
- Three grouping buckets derived client-side:
  - `confirmed`: status=confirmed AND end_date ≥ today → **Confirmed** section
  - `pending`: status=pending → **Pending Requests** section
  - `past`: status=confirmed AND end_date < today → **Past Sessions** section
- Empty-state message per section ("No confirmed bookings yet." / "No pending requests." / "No past sessions.")
- Loading state shown while fetching
- Error state with user-facing message on fetch failure
- Sidebar counts wired to `confirmed.length`, `pending.length`, `past.length`
- `data-testid` on sidebar count elements for test targeting
- `BookingCard` component handles both confirmed and pending layouts (Modify vs Cancel button)

---

## Key Decisions

- **Client-side grouping by date**: `isInPast(endDate)` uses `new Date().toISOString().slice(0,10)` for reliable UTC date comparison. Avoids server-side timezone assumptions.
- **Declined bookings hidden**: not shown in any section (not relevant to parent's planning).
- **No real-time subscription yet**: polling-acceptable per issue — a `useEffect` on mount is sufficient for now.
- **data-testid on counts**: sidebar count `<p>` elements get `data-testid` attributes because "Pending"/"Completed" text appears in both badges and sidebar labels, making CSS-class selectors fragile.

---

## Test Results

- `__tests__/api-bookings.test.ts`: 26/26 pass (7 new GET tests added)
- `app/(parent)/bookings/page.test.tsx`: 19/19 pass (new file, 19 tests across 5 describe blocks)
- Full suite: **155 passed | 11 skipped | 0 failed**
- `npm run lint`: 0 errors (7 pre-existing warnings, unchanged)

---

## TDD Commit History (planned)

- `test(RED): #17 GET /api/bookings + BookingsPage tests`
- `feat(GREEN): #17 GET /api/bookings + BookingsPage real data`
- `refactor(REFACTOR): #17 Prettier format bookings page`

---

## Next Recommendations

- Add Supabase Realtime subscription on `bookings` table for live status updates (stretch goal from issue)
- PATCH /api/bookings/[id] could mark availability as is_booked=true on confirm
- E2E test: Playwright flow — login as parent → view bookings page → check sections
