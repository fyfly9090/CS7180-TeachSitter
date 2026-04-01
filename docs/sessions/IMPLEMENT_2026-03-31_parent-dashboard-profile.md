# IMPLEMENT — Parent Dashboard & Profile Pages (UI)

**Date:** 2026-03-31
**Branch:** feature/18-parent-dashboard-profile
**Issue:** #18

---

## What Was Built

### Dashboard (`/app/(parent)/dashboard/page.tsx`)

- Added `htmlFor`/`id` attributes to Date From and Date To labels + inputs (enables `getByLabelText` in tests)
- Added `AddChildModal` component — opens on "Add Child" button click, contains Name/Age/Classroom fields, Cancel closes it
- Modal renders via `role="dialog"` with `aria-modal="true"`

### Profile (`/app/(parent)/profile/page.tsx`)

- Added `AddChildModal` component (same as dashboard)
- Added `htmlFor`/`id` to Current Password and New Password labels + inputs
- Added form validation in `handleSaveChanges`:
  - New password < 8 chars → "Password must be at least 8 characters"
  - New password set but current is empty → "Current password is required"
  - Both empty → no-op (no error)
  - Both valid (≥8 chars) → no error
- Error message rendered via `<p className="text-xs text-error">`

### Tests (TDD — RED → GREEN)

- `app/(parent)/dashboard/page.test.tsx` — 28 tests covering structure, search navigation with params, children cards, Add Child modal, AI Match sidebar
- `app/(parent)/profile/page.test.tsx` — 28 tests covering header card, children section, Add a Child modal, account settings fields, form validation

---

## Key Decisions

- Classroom badge test in dashboard uses `getAllByText` (not `getByText`) because the select dropdown has identical option text — avoids "multiple elements" error
- Validation order: length check before "current required" check so short passwords are caught first regardless of current password state
- Both pages share identical `AddChildModal` — no shared component extraction (single use in each file, DRY would be premature here)

---

## Test Results

```
Test Files  14 passed | 1 skipped (15)
Tests      236 passed | 11 skipped (247)
```

Lint: 0 errors, 11 pre-existing warnings (security/detect-object-injection in other files)

---

## What's Not Done (Out of Scope)

- `AddChildModal` submit is a placeholder (no API call) — wire-up is separate issue
- "Edit" buttons on child cards are placeholders
- Dashboard children and AI matches are static fixtures — real data fetch is separate
