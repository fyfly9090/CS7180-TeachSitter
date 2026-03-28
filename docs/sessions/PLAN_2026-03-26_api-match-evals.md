# PLAN — POST /api/match + GET /api/evals

**Date:** 2026-03-26
**Branch:** feature/11-teachers-available-supabase-redis
**Refs:** EXPLORE_2026-03-26_api-match-evals.md

---

## Scope

Two new endpoints:

- `POST /api/match` — AI ranking, eval logging, async judge
- `GET /api/evals` — admin-only paginated eval history

---

## File Plan

```
lib/ai/gemini.ts          ← new: Gemini 1.5 Pro rankTeachers()
lib/ai/claude.ts          ← new: Claude 3.5 Sonnet rankTeachers()
lib/api/match.ts          ← new: runMatch() — parallel race + logging + judge
app/api/match/route.ts    ← new: POST handler
app/api/evals/route.ts    ← new: GET handler
__tests__/api-match.test.ts   ← new: TDD tests for /api/match
__tests__/api-evals.test.ts   ← new: TDD tests for /api/evals
```

---

## Interface Design

### `lib/ai/gemini.ts` + `lib/ai/claude.ts`

Both export the same interface (Strategy pattern):

```typescript
export async function rankTeachers(input: MatchRequestInput): Promise<RankedTeacher[]>;
```

Internally:

1. Build a structured prompt
2. Call the model API
3. Extract the JSON array from the response text
4. Parse and validate as `RankedTeacher[]`
5. Throw on parse failure (caller catches and falls through)

Prompt template (same for both providers):

```
You are ranking babysitting teachers for a parent.
Return ONLY valid JSON — an array with no extra text:
[{"id":"...","name":"...","rank":1,"reasoning":"..."},...]

Rank higher if the teacher's classroom matches the child's classroom.
Child's classroom: {child_classroom}

Teachers:
{JSON.stringify(teachers, null, 2)}
```

### `lib/api/match.ts`

```typescript
export async function runMatch(
  input: MatchRequestInput,
  supabase: SupabaseClient
): Promise<{ ranked_teachers: RankedTeacher[]; eval_id: string }>;
```

Steps:

1. `Promise.any([rankTeachersGemini(input), rankTeachersClaud(input)])` — first success wins
2. If both fail → fallback to `matchTeachers()` from `lib/ai/match.ts`
3. Insert row into `match_evals` → get `eval_id`
4. `void runJudge(eval_id, input, ranked_teachers, supabase)` — fire-and-forget
5. Return `{ ranked_teachers, eval_id }`

### Judge (`runJudge`) — internal to `lib/api/match.ts`

```typescript
async function runJudge(
  evalId: string,
  input: MatchRequestInput,
  ranked: RankedTeacher[],
  supabase: SupabaseClient
): Promise<void>;
```

- Call Claude with judge prompt from PRD
- Parse score (0–10) from response
- `UPDATE match_evals SET judge_score = score WHERE id = evalId`
- Catch all errors silently — never propagates

### `app/api/match/route.ts`

```typescript
export const POST = withApiHandler(async (req) => {
  // 1. Auth: parent only
  // 2. Parse body with matchRequestSchema
  // 3. await runMatch(input, supabase)
  // 4. return NextResponse.json({ ranked_teachers, eval_id })
});
```

### `app/api/evals/route.ts`

```typescript
export const GET = withApiHandler(async (req) => {
  // 1. Auth: admin only (user_metadata.role === "admin")
  // 2. Parse query params with evalsQuerySchema
  // 3. Supabase: select(*) from match_evals, order by created_at desc, range(offset, offset+limit-1)
  // 4. Count total: select(count) from match_evals
  // 5. return NextResponse.json({ evals, total })
});
```

---

## Test Plan

### `__tests__/api-match.test.ts`

Mock: `@sentry/nextjs`, `../lib/supabase/server`, `../lib/ai/gemini`, `../lib/ai/claude`, `../lib/ai/match`

**Route handler tests:**

- 401 when unauthenticated
- 403 when user is teacher (not parent)
- 400 when required fields missing (parent_id, child_classroom, dates, teachers)
- 400 when teachers array is empty
- 400 when end_date < start_date
- 200 with ranked_teachers + eval_id on success (Gemini wins race)
- 200 when Claude wins race (Gemini mock rejects)
- 200 with fallback ranking when both AI providers fail
- 502 only raised if... actually per spec: 502 if both AI providers fail.
  BUT: PRD says fallback to `matchTeachers()`. Reconcile: return 200 with fallback, not 502.
  (502 would only apply if we have no fallback — with matchTeachers() stub, we always return 200)
- eval_id in response is a UUID (DB insert happened)
- judge is fire-and-forget (doesn't block response)

**runMatch unit tests (optional):** covered by route tests via mocks.

### `__tests__/api-evals.test.ts`

Mock: `@sentry/nextjs`, `../lib/supabase/server`

- 401 when unauthenticated
- 403 when user is parent or teacher (not admin)
- 200 with evals array + total on valid admin request
- default limit=20, offset=0 when not provided
- custom limit + offset applied to query
- 400 when limit > 100
- empty evals array when no records

---

## TDD Order

1. Write `__tests__/api-match.test.ts` — confirm RED
2. Write `__tests__/api-evals.test.ts` — confirm RED
3. Implement `lib/ai/gemini.ts`
4. Implement `lib/ai/claude.ts`
5. Implement `lib/api/match.ts`
6. Implement `app/api/match/route.ts` → confirm GREEN
7. Implement `app/api/evals/route.ts` → confirm GREEN
8. REFACTOR if needed

---

## Constraints / Decisions

- `Promise.any()` for parallel race — rejects only if ALL reject (AggregateError)
- Fallback to deterministic `matchTeachers()` on AggregateError — always returns 200
- Judge uses Claude (already have SDK), not Gemini, to keep judge provider stable
- `lib/ai/match.ts` stays as-is (deterministic fallback only)
- No retry logic on AI providers — single attempt each, race wins
- Env vars required: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
