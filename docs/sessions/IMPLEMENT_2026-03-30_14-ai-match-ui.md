# IMPLEMENT — 2026-03-30 — #14 AI-ranked teacher results display with reasoning (UI)

## What Was Built

### Branch

`feature/14-ai-match-ui` (from `feature/13-ai-match`)

### Changes

#### `app/(parent)/search/page.tsx`

- Removed server-side AI ranking (`rankTeachers` helper + Gemini import)
- Now only fetches available teachers from DB (fast, no AI latency on page load)
- Extracts `parentId` from Supabase session and passes it to `SearchClient`
- Result: initial page render is faster; AI ranking happens client-side async

#### `app/(parent)/search/SearchClient.tsx`

- Added `parentId?: string` prop
- Added `rank?: number` to `TeacherResult` type
- Added **rank badge** (`#1 Match`, `#2 Match`, …) overlaid top-right of the photo panel — styled with `secondary-container` (orange) to match AI reasoning box accent
- Added **AI ranking loading indicator** (`data-testid="ai-ranking-loading"`) shown between filter bar and results while `/api/match` is pending
- Added `useEffect` that calls `POST /api/match` client-side whenever the search key changes (dates/classroom params from server)
- Used **derived state** pattern (`aiResult` + `aiSettledKey`) to avoid synchronous `setState` inside effects (compliance with `react-hooks/set-state-in-effect` lint rule)
- Graceful degradation: if `/api/match` fails or returns non-ok, unranked results remain visible without error message
- Results are re-ordered by rank and reasoning injected when AI response arrives

### UX Flow (as specified)

1. Filter bar → "Update Results" → `router.push()` → server fetches teachers (fast)
2. Unranked results render immediately
3. Simultaneously: client calls `POST /api/match` (via Next.js API route proxy — no direct AI calls from client)
4. AI loading indicator shows while ranking in-flight
5. When response arrives: results re-ordered, rank badges + reasoning boxes injected
6. If `/api/match` fails: unranked results stay, no error shown

## Key Decisions

### Derived State for Loading Indicator

Instead of `setIsAiRanking(true)` (synchronous setState in effect, flagged by `react-hooks/set-state-in-effect`):

- `aiResult: { searchKey, teachers }` — set async in `.then()`
- `aiSettledKey: string | null` — set async in `.finally()` (marks search complete)
- `isAiRanking = wouldRank && aiSettledKey !== searchKey` — computed in render

This pattern avoids all synchronous `setState` inside effects while preserving correct loading behavior.

### Server-Side Simplification

Removing AI ranking from `page.tsx` speeds up initial page load. The trade-off is one extra client-side fetch after render, which matches the UX flow required by the issue (#14).

### Rank Badge Position

Top-right of photo panel (mirrors "Verified" badge in top-left), using `secondary-container` (orange) to visually link to the AI reasoning box's left border accent.

## Test Results

- 32 tests in `page.test.tsx` (all pass, 10 new tests added)
- 125 total tests pass, 11 skipped
- `npm run lint`: 0 errors, 7 pre-existing warnings

## Git History

```
test(RED): #14 add failing tests for rank badges and AI ranking loading indicator
feat(GREEN): #14 client-side AI match call, rank badges, separate loading indicator
```

## Next Recommendations

- Issue #15 or follow-on: E2E test for the full search→AI-rank UX flow with Playwright
- Consider adding debounce to filter changes to reduce unnecessary `/api/match` calls
- The `match_evals` judge scoring (async 0-10) could surface on the UI once scoring completes
