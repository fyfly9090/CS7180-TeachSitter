# IMPLEMENT: Issue #6 — Teacher Profile Setup Page (UI)

**Date:** 2026-03-31
**Branch:** feature/6-teacher-profile-setup
**Issue:** [fyfly9090/CS7180-TeachSitter#6](https://github.com/fyfly9090/CS7180-TeachSitter/issues/6)

---

## What Was Built

Full implementation of the `/teacher/setup` page and its supporting API layer.

### New files

- `app/teacher/setup/page.tsx` — Two-column profile setup page matching the approved mockup
- `app/api/teachers/me/route.ts` — `GET` endpoint: returns the authenticated teacher's profile + availability
- `app/api/teachers/[id]/route.ts` — `PATCH` endpoint: updates classroom, bio, expertise, and replaces availability blocks
- `lib/utils/expertise.ts` — Pure `toggleExpertise()` utility (add/remove from array, idempotent)
- `supabase/migrations/006_add_expertise_to_teachers.sql` — Adds `expertise text[]` column
- `public/placeholder-avatar.png` — Static avatar from the approved mockup
- `__tests__/teacher-setup-page.test.tsx` — 21 component tests (load, interaction, save, validation, errors)
- `__tests__/api-teacher-profile.test.ts` — 26 API tests (auth, Zod, ownership, success, availability)
- `__tests__/expertise-toggle.test.ts` — 5 property-based tests via fast-check

### Modified files

- `lib/validations/index.ts` — Added `availabilityBlockSchema` and `availability` field to `updateTeacherProfileSchema`
- `types/index.ts` — Added `expertise: string[]` to `Teacher` interface; tightened `Database.teachers.Update`
- `package.json` / `vitest.config.ts` — Switched test environment from `jsdom` to `happy-dom` for component tests

---

## Key Decisions

1. **Availability replace strategy** — On save, all unbooked rows are deleted and the current set is reinserted. Simpler than diffing individual blocks; booked rows are preserved via `eq("is_booked", false)`.

2. **Static placeholder avatar** — Photo upload was scoped out. The mockup image (`unnamed(1).png`) is served from `/public/placeholder-avatar.png`. Camera icon is kept as a visual decoration with no click handler.

3. **Availability schema optional on server, required on client** — `availability` is optional in the Zod schema so existing tests/callers without it continue to work. Client enforces ≥1 block before calling the API.

4. **String date comparison** — `block.to < block.from` uses lexicographic ordering, which is correct for YYYY-MM-DD ISO dates.

5. **`teacherId` null guard** — If the profile load fails, `teacherId` stays `null`. Clicking Save now shows "Profile not found — please refresh." instead of silently exiting.

---

## Test Results

```
Tests: 181 passed | 11 skipped (pre-existing RLS smoke tests)
Lint:  0 errors, 8 warnings (all pre-existing)
```

---

## Course Corrections

- Initial implementation omitted availability persistence and client-side validation — identified via agent code review and fixed.
- Photo upload was implemented with `useRef` + `FileReader`, then simplified to a static placeholder per product direction.
- Removed `within` and `mockFetchGetError` unused imports flagged by ESLint.

---

## Next Recommendations

- Issue #7 (Teacher availability API — `POST/DELETE /api/teachers/[id]/availability`) is a natural follow-on if finer-grained availability editing is needed.
- Apply migration 006 to production via `supabase db push` or the Supabase MCP.
