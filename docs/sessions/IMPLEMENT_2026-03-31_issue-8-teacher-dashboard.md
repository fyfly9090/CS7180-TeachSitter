# IMPLEMENT: Issue #8 — Teacher Dashboard Page (UI)

**Date:** 2026-03-31
**Branch:** feature/8-teacher-dashboard
**Issue:** [fyfly9090/CS7180-TeachSitter#8](https://github.com/fyfly9090/CS7180-TeachSitter/issues/8)

---

## What Was Built

Wired the teacher dashboard to live API data with optimistic accept/decline.

### New files

- `app/api/teachers/me/bookings/route.ts` — GET handler returning teacher's bookings split into `{ confirmed, pending }`. Pending bookings enriched with `parent_email` + `parent_display_name` via service client (bypasses RLS to read parent profiles).
- `lib/utils/format.ts` — `emailToDisplayName()` (email → title-cased name) and `formatDateRange()` (YYYY-MM-DD pair → "Jun 16 – Jun 20, 2026")
- `__tests__/api-teacher-bookings.test.ts` — 7 API tests (auth, data, errors)
- `__tests__/teacher-dashboard-page.test.tsx` — 11 page component tests (loading, data display, empty states, accept/decline, optimistic revert)

### Modified files

- `app/teacher/dashboard/page.tsx` — Replaced hardcoded static data with `useEffect` fetch; dynamic greeting, stats, sessions, requests; Accept/Decline wired to `PATCH /api/bookings/[id]` with optimistic updates + rollback on failure; loading spinner + error banner + empty states
- `types/index.ts` — Added `BookingWithParent` interface extending `Booking` with `parent_email` and `parent_display_name`

---

## Key Decisions

1. **Two-phase fetch for parent profiles** — Server client fetches bookings (RLS-aware), then service client fetches parent profiles by ID (bypasses RLS). This avoids leaking parent data beyond email.
2. **Email-to-name derivation** — `emailToDisplayName("patricia.johnson@example.com")` → `"Patricia Johnson"`. Falls back to `"Parent"` if parsing fails.
3. **Status enum alignment** — Used `"confirmed"` / `"declined"` (matching DB schema), not `"accepted"`.
4. **Optimistic updates with rollback** — Accept/Decline immediately update local state; revert on PATCH failure with error message.
5. **Button disable during PATCH** — `updatingId` state prevents double-submission race conditions.

---

## Test Results

```
Tests: 225 passed | 11 skipped (pre-existing RLS smoke tests)
New:   7 API tests + 11 page tests = 18
Lint:  0 errors
```
