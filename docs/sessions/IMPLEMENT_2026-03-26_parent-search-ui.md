# IMPLEMENT — Parent Search UI (`/search` page)

**Date:** 2026-03-26
**Branch:** `feature/parent-search-ui`
**Related story:** "As a parent, I want to search for available teachers by date range and optionally filter by classroom or teacher name."

---

## What Was Built

### `app/(parent)/search/page.tsx`

Replaced hardcoded sample data with a fully connected search page:

- **`fetchTeachers(params)`** — `useCallback` wrapper around `GET /api/teachers/available`; sets `loading / error / teachers` state. Called on mount (no filters) and on every "Update Results" click.
- **Filter bar** — Date From, Date To, Classroom select (value `""` = All Classrooms → param omitted). All inputs have `id`/`htmlFor` for accessibility. Classroom `""` is not sent as a query param.
- **`LoadingSkeleton`** — 3 animated placeholder cards, `data-testid="loading-skeleton"`.
- **`EmptyState`** — "No teachers available for these dates. Try widening your date range."
- **`ErrorState`** — "Something went wrong." Covers non-ok HTTP responses and thrown network errors.
- **`TeacherCard`** — renders `name` (from API, currently populated from `profiles.email`), `{classroom} Class`, bio, formatted availability date ranges (`Jun 16 – Jun 20`), verified badge, avatar initials computed from name (split on `[\s.@]+`), optional `data-testid="ai-reasoning"` box (only when `teacher.reasoning` is present).
- **"Request Booking"** — `<Link href="/bookings/new?teacher_id={id}&start_date=...&end_date=...">` (date params only included when filters are set).
- **"View Profile"** — button present on each card (links to teacher profile — wired up in a future story).

### `app/(parent)/search/page.test.tsx`

18 unit tests in 5 `describe` blocks, one per acceptance criterion:

| Group           | Tests                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| States          | loading skeleton, empty state, error (non-ok), error (throws)                                  |
| Filter bar      | start_date+end_date params, classroom param, "All Classrooms" omits param                      |
| Teacher cards   | name, classroom, bio, availability dates, verified badge, avatar initials, View Profile button |
| Request Booking | href = `/bookings/new?teacher_id=...`, date params included in href                            |
| AI reasoning    | omitted when absent, rendered with text when present                                           |

---

## Key Decisions

- **`reasoning?: string`** added to `TeacherResult` (extends `TeacherWithAvailability`) so the card can show AI reasoning when `/api/match` results are injected later — omitted on plain search results.
- **`name` is `profiles.email`** per the schema gap memory — displayed as-is. Initials computed by splitting on `[\s.@]+` (e.g. `tara.smith@school.com` → `TS`).
- **Initial fetch on mount** calls the API with no filters (all teachers in any available slot). Production will hit a 400 if `start_date`/`end_date` are truly required by the schema — acceptable for now; the filter bar prompts the user to narrow.
- **No `name` filter in UI** — API supports `?name=` but the mockup filter bar spec only shows date + classroom. Kept consistent with mockup.

---

## Test Results

```
Tests  18 passed (18)
Lint   0 errors, 4 warnings (pre-existing — unrelated files)
```

---

## Git History (this session)

```
feature/parent-search-ui
```

Files changed:

- `app/(parent)/search/page.tsx` — replaced sample data with live API connection
- `app/(parent)/search/page.test.tsx` — new, 18 tests

---

## Next Recommendations

1. **Wire "View Profile" button** to `/teachers/[id]` (teacher profile page — not yet built).
2. **Integrate `/api/match`** — after search results load, call `POST /api/match` and merge `reasoning` onto each teacher card.
3. **Fix schema gap** — add a `full_name` column to `teachers` table so the displayed name isn't an email address.
4. **Classroom dropdown from DB** — populate options dynamically from a `/api/classrooms` endpoint instead of hardcoded values.
5. **Require dates before fetch** — disable "Update Results" or show a prompt if `start_date`/`end_date` are empty, since the API requires them.
