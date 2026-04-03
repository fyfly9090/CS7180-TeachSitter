# EXPLORE — Issue #10: Teacher Booking Requests Page

**Date:** 2026-04-03
**Issue:** #10 — Teacher booking requests page (UI)

## Findings

### Existing Infrastructure

- **API endpoint**: `GET /api/teachers/me/bookings` returns `{ confirmed: BookingWithParent[], pending: BookingWithParent[] }`
- **PATCH endpoint**: `PATCH /api/bookings/[id]` accepts `{ status: "confirmed" | "declined" }`
- **Types**: `BookingWithParent` extends `Booking` with `parent_email` and `parent_display_name`
- **Utilities**: `formatDateRange(start, end)` and `emailToDisplayName(email)` in `lib/utils/format.ts`

### Teacher Dashboard (reference)

- `app/teacher/dashboard/page.tsx` has inline navbar + mobile nav + stats + booking grid
- Navbar and mobile nav are duplicated — should be extracted to a shared layout

### Missing on main

- No `app/teacher/layout.tsx` — navbar is inline in dashboard page
- No `app/teacher/requests/` directory

### Mockup Analysis (`docs/mockups/Teacher_booking_requests_ TeachSitter.html`)

- Stats grid: 2 cards (Upcoming count, Pending count)
- Main grid: lg:grid-cols-12 — bookings (col-span-8) + pending sidebar (col-span-4)
- Confirmed rows: child avatar, name, description, date/time, Details button
- Pending cards: initials avatar, parent name, message, Accept/Decline buttons
- Color tokens: primary (#455e87), secondary (#a14009), background (#fcf9f4)

## Decisions

- Create `app/teacher/layout.tsx` to share navbar across teacher pages
- Requests page will be a client component fetching from `/api/teachers/me/bookings`
- Optimistic UI for accept/decline with rollback on error

## Next Steps

- Write implementation plan
- Create layout, then tests (RED), then page (GREEN)
