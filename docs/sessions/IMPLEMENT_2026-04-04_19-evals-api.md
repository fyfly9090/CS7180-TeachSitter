# IMPLEMENT — #19 GET /api/evals (2026-04-04)

## What Was Built

- `GET /api/evals` — admin-only paginated endpoint returning historical AI match eval records
- Auth: Supabase session → 401 unauthenticated, 403 non-admin
- Pagination: `limit` (default 20, max 100) + `offset` (default 0), validated via `evalsQuerySchema`
- Response: `{ evals: [...], total: number }`, ordered by `created_at DESC`

## Security Review (Agent: security-reviewer)

Before implementation, the `security-reviewer` agent reviewed the endpoint design in C.L.E.A.R. format.

**Key findings acted on:**

| Finding                                                                               | Severity     | Action                                                                                |
| ------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `select("*")` overfetches — future schema columns would silently leak                 | Medium       | Fixed: explicit column list `id, parent_id, ranked_teachers, judge_score, created_at` |
| RLS policy on `match_evals` must be confirmed                                         | Medium       | Documented; verified in existing migration that RLS is enabled                        |
| Option B (`x-admin-secret` header) rejected in favor of Option A (session role check) | Architecture | Confirmed: using `user.user_metadata.role === "admin"` consistent with other routes   |

## TDD

- RED: `__tests__/api-evals.test.ts` already existed (10 tests covering auth, pagination, response shape)
- GREEN: `app/api/evals/route.ts` implemented; all 10 tests pass
- Security fix applied post-review: `select("*")` → explicit columns; tests still pass

## Key Decisions

- Admin role via `user.user_metadata.role` (not header secret) — consistent with codebase pattern, revocable, session-scoped
- Explicit column select prevents accidental data exposure if `match_evals` schema grows
- `withApiHandler` + `errors.*` helpers ensure no stack traces reach the client

## Test Results

```
✓ __tests__/api-evals.test.ts (10 tests) — all pass
```

## Agent Usage Evidence

The `security-reviewer` agent (`.claude/agents/security-reviewer.md`) produced a full C.L.E.A.R. review of the endpoint design before a single line of implementation was written. The wildcard select finding directly informed the final implementation.
