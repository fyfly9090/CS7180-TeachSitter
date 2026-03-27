# EXPLORE — POST /api/match + GET /api/evals

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis

---

## Files Examined

| File | Status |
|------|--------|
| `lib/ai/match.ts` | Deterministic stub — same-classroom = rank 1, used only in unit test |
| `lib/validations/index.ts` | `matchRequestSchema` + `evalsQuerySchema` already defined ✓ |
| `types/index.ts` | `RankedTeacher`, `MatchEval` types defined ✓ |
| `__tests__/ai-matching.test.ts` | 1 test — tests matchTeachers() stub, NOT the route |
| `app/api/match/` | **Does not exist** — must be created |
| `app/api/evals/` | **Does not exist** — must be created |
| `package.json` | `@anthropic-ai/sdk: ^0.80.0` + `@google/generative-ai: ^0.24.1` ✓ installed |
| `lib/errors.ts` | `withApiHandler`, `errors.*` available ✓ |
| `lib/supabase/server.ts` | `createServerClient()` for API routes ✓ |

---

## Key Findings

### 1. AI SDK Availability
Both SDKs are installed and ready:
- `@anthropic-ai/sdk` — `new Anthropic().messages.create()`
- `@google/generative-ai` — `new GoogleGenerativeAI(key).getGenerativeModel()`

Both must be called server-side only (Node runtime — no Edge).

### 2. matchTeachers() Stub Gap
`lib/ai/match.ts` is a deterministic fallback (same classroom → rank 1). It does NOT call any AI.
The real `/api/match` route needs:
- Prompt construction from parent + teacher data
- Parallel calls to both providers
- Parsing JSON rankings from model responses
- Fallback to `matchTeachers()` only if both AI providers fail

### 3. match_evals Logging
`match_evals` table: `id, parent_id, ranked_teachers (json), judge_score (nullable), created_at`
- Insert on every `/api/match` call → return the new `eval_id` in response
- `judge_score` starts null, updated asynchronously by LLM-as-judge

### 4. LLM-as-Judge (Async Fire-and-Forget)
After inserting the eval row, trigger the judge in a `void`-prefixed promise:
- Call one AI model (Claude) with the judge prompt from CLAUDE.md
- Parse 0–10 score from response
- `UPDATE match_evals SET judge_score = N WHERE id = eval_id`
- Never await — never block the response

### 5. GET /api/evals — Admin Role Gap
`UserRole = "parent" | "teacher"` — no `admin` variant in the schema.
Signup form only allows parent/teacher. Admin users must be set manually in Supabase (`user_metadata.role = "admin"`).
The route checks `role === "admin"` — correct and consistent with the API spec.

### 6. Ranking Response Parsing Strategy
AI models return free-form text. Need a structured prompt that forces JSON output.
Prompt template:
```
You are ranking babysitting teachers for a parent.
Return ONLY a JSON array: [{ "id": "...", "rank": 1, "reasoning": "..." }, ...]
Rank by: same classroom as child first, then by bio completeness.
Parent's child classroom: {child_classroom}
Teachers: {JSON.stringify(teachers)}
```
Parse with `JSON.parse()` inside try/catch — if parsing fails, fall through to other provider.

---

## What Needs Building

### POST /api/match
1. `lib/ai/gemini.ts` — `rankTeachers(input): Promise<RankedTeacher[]>` via Gemini 1.5 Pro
2. `lib/ai/claude.ts` — `rankTeachers(input): Promise<RankedTeacher[]>` via Claude 3.5 Sonnet
3. `lib/api/match.ts` — `runMatch(input, supabase)`: parallel race + eval insert + async judge
4. `app/api/match/route.ts` — POST handler: auth (parent) + validate + call runMatch

### GET /api/evals
5. `app/api/evals/route.ts` — GET handler: auth (admin) + parse query + paginated Supabase query

---

## Next Step
→ Write PLAN doc → TDD implement
