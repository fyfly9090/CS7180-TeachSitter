# IMPLEMENT — 2026-03-30 — Fix /api/match 500 (RLS) and duplicate #1 rank badges

## Branch

`feature/14-ai-match-ui`

## Bugs Fixed

### Bug 1: POST /api/match returns 500 — match_evals RLS blocks insert

**Root cause:** `match_evals` has a deny-all RLS policy:

```sql
CREATE POLICY "match_evals: deny authenticated"
  ON public.match_evals FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
```

`createServerClient` uses anon key + user session → subject to RLS → insert fails → 500.

**Fix:**

- Created `lib/supabase/admin.ts` — uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Updated `lib/api/match.ts` — `match_evals` insert/update now uses `createAdminClient()` instead of the user's session client
- Removed `supabase: SupabaseClient` param from `runMatch()` — no longer needed
- Updated `app/api/match/route.ts` — no longer passes supabase to `runMatch`
- Updated `__tests__/api-match.test.ts` — added mock for `../lib/supabase/admin`; moved `from()` chain mock from `createServerClient` to `createAdminClient`

### Bug 2: All teacher cards show "#1 Match" — matchTeachers assigns rank 1 to all

**Root cause:** In `lib/ai/match.ts`, when `child_classroom === ""` (no classroom filter selected), every teacher was assigned `rank: 1`. Since the search URL had no classroom param, all teachers received the same rank.

**Fix:** Unified rank assignment — sort by classroom match first, then assign sequential ranks via `.map((t, i) => ({ rank: i + 1 }))`. Teachers without classroom filter get ranks 1, 2, 3... in original order. Teachers with a matching classroom are ranked higher.

**Test updated:** `__tests__/ai-matching.test.ts` — "should give all teachers the same rank when no classroom is specified" → "should give teachers sequential unique ranks when no classroom is specified". Old test validated the buggy behavior; updated to assert `ranks === [1, 2]`.

## Files Changed

| File                            | Change                                       |
| ------------------------------- | -------------------------------------------- |
| `lib/supabase/admin.ts`         | **New** — admin client with service role key |
| `lib/api/match.ts`              | Use admin client; remove supabase param      |
| `app/api/match/route.ts`        | Remove supabase arg from runMatch call       |
| `lib/ai/match.ts`               | Sequential rank assignment for all cases     |
| `__tests__/api-match.test.ts`   | Mock createAdminClient                       |
| `__tests__/ai-matching.test.ts` | Fix test to assert sequential ranks          |

## Test Results

- 125 tests pass, 11 skipped
- `npm run lint`: 0 errors, 7 pre-existing warnings

## Git History

```
fix: match_evals RLS 500 via admin client; fix duplicate #1 rank badges
```
