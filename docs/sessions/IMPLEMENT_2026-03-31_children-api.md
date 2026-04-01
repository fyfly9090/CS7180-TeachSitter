# IMPLEMENT: Children API + Dashboard/Profile Functional UI

**Date:** 2026-03-31
**Branch:** feature/17-bookings-status-ui (continuing issue #17 work)
**Issues:** #18 (parent dashboard & profile pages)

---

## What Was Built

### 1. Database Migration

- `supabase/migrations/007_children_name.sql` — adds `name TEXT NOT NULL DEFAULT ''` to the `children` table for display name storage.

### 2. Type Updates

- `types/index.ts` — added `name: string` to the `Child` interface and updated `Database` children `Update` type.
- `lib/validations/index.ts` — added `createChildSchema` (Zod) with name (1–100 chars), classroom (1–100 chars), age (1–10 int).

### 3. API Routes (TDD: RED → GREEN)

**`app/api/children/route.ts`**

- `GET /api/children` — lists parent's children (auth + parent role check, ordered by `created_at ASC`)
- `POST /api/children` — creates child with name/classroom/age (Zod validation, returns 201 with child)

**`app/api/children/[id]/route.ts`**

- `DELETE /api/children/[id]` — verifies ownership via `select().eq(parent_id)` before deleting; returns 204

**Test files:** `route.test.ts` (10 tests), `[id]/route.test.ts` (4 tests) — all green.

### 4. Dashboard Page (`app/(parent)/dashboard/page.tsx`)

Rewritten from static fixtures to real API data:

- `useEffect` loads children from `GET /api/children` on mount
- Delete button on each child card → `DELETE /api/children/:id` → removes from state
- `AddChildModal` calls `POST /api/children` → `onAdd(data.child)` → appends to state
- Empty state: "No children added yet." when array is empty
- Child avatar uses `name.charAt(0)` instead of static initials

### 5. Profile Page (`app/(parent)/profile/page.tsx`)

Same pattern as dashboard:

- `useEffect` loads children from `GET /api/children`
- Delete buttons on child cards
- `AddChildModal` wired to API via `onAdd` prop

### 6. Test Updates

- `app/(parent)/dashboard/page.test.tsx` — 32 tests; all mock `global.fetch`
- `app/(parent)/profile/page.test.tsx` — 34 tests; rewrote from static fixtures to full fetch-mock pattern

---

## Key Decisions

- **`name` column added to `children`** rather than pulling from a separate profile — keeps the data model simple for the MVP.
- **Ownership check before delete** — `SELECT id, parent_id WHERE id=? AND parent_id=?` before DELETE; RLS is the actual enforcement, but the app-level check gives a 404 rather than a silent no-op.
- **`mockReturnValueOnce` for DELETE route tests** — two separate `from()` call chains (ownership select vs. delete) can't share the same mock; per-call `mockReturnValueOnce` keeps them independent.
- **Race condition fix in React tests** — initial GET `useEffect` and POST `handleSubmit` both resolve via Promise microtasks. Fix: `await waitFor(() => initial-state)` first, then `await act(async () => { click; await setTimeout(0) })` to flush the full chain before asserting.

---

## Test Results

```
Test Files: 16 passed | 1 skipped (17)
     Tests: 260 passed | 11 skipped (271)
```

Lint: 0 errors (11 pre-existing warnings, unchanged).

---

## Git History (this session)

Key commits on feature/17-bookings-status-ui leading to this work:

- `feat(GREEN): #17 parent PATCH dates + DELETE cancel + Modify Booking modal`
- `refactor: #17 remove status badge from card; Past History shows hours`
- `feat: #17 redesign bookings card UI + Past History sidebar`

This session adds children API + dashboard/profile API integration on the same branch.
