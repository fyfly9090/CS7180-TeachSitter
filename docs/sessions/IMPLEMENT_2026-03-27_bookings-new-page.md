# IMPLEMENT — Booking Request Page (`/bookings/new`)

**Date:** 2026-03-27
**Branch:** `feature/parent-search-ui`
**Related story:** "As a parent, I want to send a booking request to a teacher, so I can reserve their time for the break period I need."

---

## What Was Built

### `app/(parent)/bookings/new/page.tsx`

New booking request form page. Reads all context from URL query params (passed by the search page) and submits to `POST /api/bookings`.

- **Query params read:** `teacher_id`, `teacher_name`, `classroom`, `start_date`, `end_date`
- **Teacher summary card** — shows avatar initials, name, and classroom at the top of the form
- **Date inputs** — pre-filled from query params, required, editable by user
- **Message textarea** — optional, 500 char max (matches `createBookingSchema`)
- **Submit** — `POST /api/bookings` with `{ teacher_id, start_date, end_date, message? }`
- **Loading state** — button changes to "Sending Request…" and is disabled during submission
- **Error states:**
  - 409 conflict: shows API error message ("Teacher unavailable for requested dates")
  - Network error: shows "Something went wrong. Please try again."
- **Success** — redirects to `/bookings` via `router.push`
- **Missing `teacher_id` guard** — renders `InvalidLink` component instead of the form

### `app/(parent)/search/page.tsx` (updated)

Updated `bookingHref` in `TeacherCard` to include `teacher_name` and `classroom` as query params, enabling the booking page to display teacher context without a round-trip API call:

```tsx
const bookingHref =
  `/bookings/new?teacher_id=${teacher.id}` +
  `&teacher_name=${encodeURIComponent(teacher.name)}` +
  `&classroom=${encodeURIComponent(teacher.classroom)}` +
  (dateFrom ? `&start_date=${dateFrom}` : "") +
  (dateTo ? `&end_date=${dateTo}` : "");
```

Existing search page tests still pass (they use `stringContaining` assertions for `teacher_id` and `/bookings/new`).

### `app/(parent)/bookings/new/page.test.tsx`

14 unit tests in 3 `describe` blocks:

| Group                    | Tests                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Page display             | heading, teacher name, classroom, pre-filled start/end dates, message textarea, submit button                                    |
| Missing teacher_id guard | shows "Invalid booking link" error                                                                                               |
| Form submission          | correct POST body, message included, redirect on success, 409 error shown, network error shown, button disabled while submitting |

---

## Key Decisions

- **No new API endpoint** — teacher info (name, classroom) is passed as encoded query params from the search page, avoiding a `GET /api/teachers/[id]` round trip. This is acceptable because the user just came from the search results.
- **Dates are editable** — even though pre-filled from params, the user can adjust them. The API validates that end_date ≥ start_date.
- **`vi.doMock` + `vi.resetModules()`** — the "missing teacher_id" test requires module isolation. `vi.resetModules()` must run BEFORE `vi.doMock()` in `beforeEach` to clear the module cache before registering the new mock factory.

---

## Test Results

```
Tests  14 passed (14)   [bookings/new]
Tests  113 passed (124) [full suite]
Lint   0 errors, 4 warnings (pre-existing — unrelated files)
```

---

## Next Recommendations

1. **Connect `/bookings` page to real API** — add `GET /api/bookings` endpoint for parents to see their own booking list; replace hardcoded data in the bookings page.
2. **Teacher booking requests UI** — build the teacher-facing view (`/teacher/bookings`) to confirm/decline incoming requests (mockup: `Teacher_booking_requests_ TeachSitter.html`).
3. **Fix schema gap** — add `full_name` column to `teachers` table so displayed names aren't email addresses.
4. **Wire "View Profile" button** — add `GET /api/teachers/[id]` endpoint and build a teacher profile page.
