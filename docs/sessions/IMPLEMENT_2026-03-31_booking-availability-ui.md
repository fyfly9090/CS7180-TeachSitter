# IMPLEMENT: Teacher Availability Display on Booking Page

**Date:** 2026-03-31
**Branch:** `feature/14-ai-match-ui`

---

## What Was Built

Added teacher availability (date ranges + times) to the teacher summary card on `/bookings/new`, so parents can see when the teacher is free before filling in booking dates.

### Files Changed

| File                                      | Description                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `app/(parent)/bookings/new/page.tsx`      | Parse `availability` URL param; render availability slots in teacher card             |
| `app/(parent)/search/SearchClient.tsx`    | Append encoded `availability` JSON to `bookingHref`                                   |
| `app/(parent)/bookings/new/page.test.tsx` | 3 new tests for availability display; updated navigation mock with availability param |

---

## Implementation Summary

### Strategy: URL param encoding

Passed `teacher.availability[]` as a JSON-encoded URL param (`&availability=<encodeURIComponent(JSON.stringify(...))>`) from the search results page to the booking page. Avoids a new API call or state management overhead.

### `SearchClient.tsx` change

Added availability to `bookingHref`:

```typescript
teacher.availability.length > 0
  ? `&availability=${encodeURIComponent(JSON.stringify(teacher.availability))}`
  : "";
```

### `page.tsx` changes

1. Added `MONTHS` array + `formatDate(d)` and `formatTime(t)` helpers
2. Added `AvailabilitySlot` interface
3. Parsed `availability` param in `NewBookingContent` with try/catch for malformed input
4. Rendered availability slots in the teacher card with date ranges and optional time ranges

### Teacher card availability section

- Shows "Available" label only when slots exist
- Each slot: `Jun 15 – Jun 30 · 9:00 AM – 5:00 PM` (time shown only when both start_time and end_time are non-null)
- Uses `event_available` Material Symbol icon per slot

---

## Key Decisions

- **URL param vs fetch**: Chose URL encoding since `availability` is already in the search results — no extra network round-trip needed.
- **Graceful parse failure**: `try/catch` around `JSON.parse` silently ignores malformed param; page still renders without availability section.
- **Exact `getByText("Available")`**: Used exact string (not regex `/available/i`) to avoid matching `event_available` icon text nodes rendered by Material Symbols spans.

---

## TDD Fixes During Implementation

1. **`vi.mock()` hoisting**: `MOCK_AVAILABILITY` const was `undefined` inside the mock factory — fixed by inlining the JSON string literal directly in the factory.
2. **`getByText` multiple matches**: `/available/i` matched both the label and 2x `event_available` icon text → fixed with exact string `"Available"`.

---

## Test Results

```
npm run lint  →  0 errors, 7 pre-existing warnings
npm run test  →  129 passed, 11 skipped (RLS smoke tests require live DB)

New tests (3):
  - shows 'Available' label when availability slots are present
  - renders each availability date range (Jun 15, Jun 30, Jul 10, Jul 20)
  - shows time range for slots that have start_time and end_time (9:00 AM, 5:00 PM)
```
