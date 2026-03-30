# IMPLEMENT — 2026-03-30 — AI Match: Gemini-only (Issue #13)

## What Was Built

Completed POST /api/match (issue #13): replaced the parallel Gemini + Claude race with a
single Gemini 1.5 Pro provider. All AI ranking and eval judging now go through Gemini only.

### Files Changed

| File                          | Change                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/ai/gemini.ts`            | Added `JUDGE_PROMPT` + `judgeRanking()` export; added `pickGeminiKey()` for multi-key rotation                           |
| `lib/api/match.ts`            | Removed `Promise.any()` race; simplified to single `rankGemini()` call with deterministic fallback; updated judge import |
| `lib/ai/claude.ts`            | **Deleted**                                                                                                              |
| `__tests__/api-match.test.ts` | Removed Claude mock and "Claude wins" test scenario; 13 → 12 tests, all green                                            |
| `.env.local`                  | Added `GEMINI_API_KEY` with 5 comma-separated keys                                                                       |

## Key Decisions

**Gemini-only instead of race:** User has multiple Gemini API keys but no Anthropic key.
`Promise.any()` race was simplified to a single provider call + deterministic fallback.

**Multi-key rotation:** `GEMINI_API_KEY` accepts a comma-separated list. `pickGeminiKey()`
randomly selects one per request to distribute rate-limit pressure across 5 keys.

**Judge moved to Gemini:** `judgeRanking()` was ported from `lib/ai/claude.ts` to
`lib/ai/gemini.ts` using the same prompt and response shape. Fire-and-forget behavior unchanged.

## TDD Workflow

- Updated tests first (removed Claude mock + "Claude wins" test)
- Confirmed tests still GREEN (mocks made Claude's removal transparent at test level)
- Implemented changes: gemini.ts → match.ts → deleted claude.ts
- Confirmed 12/12 GREEN, full suite 113/113 passed

## Git History

```
83761d8 feat: #13 replace Claude with Gemini for ranking and judge
```

## Test Results

```
Tests  113 passed | 11 skipped (124)
Lint   0 errors, 6 warnings (all pre-existing)
```

## Next Recommendations

- Push `feature/13-ai-match` and open PR (Closes #13)
- Verify `/api/match` end-to-end with real Gemini keys via `npm run dev`
- Consider adding a key-health check that retries with the next key on 429 rate-limit errors
