# IMPLEMENT: Feature/18 Merge Resolution + Teacher Profile Feature

**Date:** 2026-04-04
**Branch:** feature/18-parent-dashboard-profile
**Issue:** #18 Parent Dashboard & Profile

---

## What Was Built

### New Feature: Teacher Profile Page (`/teachers/[id]`)

- `app/(parent)/teachers/[id]/page.tsx` — full teacher profile page
  - Avatar with initials, full name, position + Verified badge, classroom, hourly rate, bio, availability slots
  - Book CTA: `Request {firstName}` — skips honorifics (Ms., Mr., Mrs., Dr., Prof.)
  - Helpers: `emailToName`, `getDisplayName`, `getFirstName`, `getInitials`, `formatDate`, `formatTime`
  - Fetches from `/api/teachers/{id}` on mount; loading/notFound states

### Fixed: Teacher Profile API (`app/api/teachers/[id]/route.ts`)

- Merged add/add conflict between feature/18 (GET with profiles join) and main (PATCH)
- GET uses `createServiceClient` to bypass RLS for `profiles!inner(email)` join
- Added `TeacherRow` interface to resolve TypeScript `never` type error from Supabase inferred types
- PATCH retained from main: ownership check + `updateTeacherProfileSchema` + availability replace

### Fixed: Dashboard AI Suggestions (fake IDs → real fetch)

- Replaced hardcoded `aiSuggestions` with `teacherId: "t1"` etc. with `useEffect` fetching real `/api/teachers/available`
- Added `emailToName` helper; display name uses `full_name ?? emailToName(email)`
- View Profile button navigates to `/teachers/{id}` (not `/search?name=...`)
- Fixed booking failure: `teacher_id: Invalid UUID` 400 error eliminated

### Fixed: Search Page View Profile

- Changed "View Profile" from `<button>` to `<Link href="/teachers/{id}">` for direct navigation

### Fixed: `lib/validations/index.ts` duplicate exports

- Removed duplicate schema definitions added by feature/18 that conflicted with main's more complete versions (with `ALL_EXPERTISE`)

---

## Key Decisions

- **`createServiceClient` in GET**: `profiles!inner(email)` join is blocked by RLS for non-owner users; service client bypasses this cleanly without weakening RLS on other tables
- **`TeacherRow` cast**: Supabase can't infer the type of complex join selects → explicit interface + `as unknown as TeacherRow`
- **`getFirstName` skipping honorifics**: Set-based lookup (`new Set(["ms.", "mr.", ...])`) — O(1), easy to extend
- **Merge strategy**: Keep feature/18's GET (profiles join) + main's PATCH (expertise/availability schema) in single route file

---

## Test Results

- 386 tests passed, 11 skipped (RLS smoke tests require live DB)
- 0 lint errors (19 pre-existing warnings, none new)
- Fixed `Cannot find package 'server-only'` in vitest by adding `vi.mock("../lib/supabase/service")` to both `api-teacher-availability.test.ts` and `api-teacher-profile.test.ts`

---

## Git History (this session)

Key commits in feature/18:

- `feat: #18 fetch real teacher data for AI suggestions sidebar`
- `feat: #18 teacher profile page /teachers/[id]`
- `fix: #18 search View Profile navigates to /teachers/[id]`
- `fix: #18 merged conflict in api/teachers/[id]/route.ts`
- `fix: #18 remove duplicate schema exports after merge`
- `fix: #18 mock createServiceClient in test files`

---

## Next Recommendations

1. Merge feature/18 PR → main after review
2. Feature/19 (`/api/evals`) is already on its own branch — continue there
3. Consider adding an E2E test for the teacher profile page booking CTA flow
