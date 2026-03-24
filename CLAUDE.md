# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Verification

⭐ Start every message with a star emoji to confirm you have read these instructions (unless generating special formats).

## Additional Context

@docs/PRD.md
@docs/API.md

---

## Project Overview

TeachSitter connects preschool parents with their school's teachers for babysitting during school breaks. Teachers post availability, parents search and book, AI ranks matches by classroom familiarity.

---

## Commands

```bash
npm run dev                           # Start dev server
npm run build                         # Production build
npm run lint                          # ESLint + Prettier — run before PR
npm run test                          # Vitest unit/integration — run before PR
npm run test -- path/to/file.test.ts  # Single test file
npm run test:e2e                      # Playwright E2E
npm run test:coverage                 # Coverage report (target >80%)
```

---

## Tech Stack

| Layer           | Technology                                                     |
| --------------- | -------------------------------------------------------------- |
| Frontend        | Next.js 15+ (App Router), React 19, Tailwind CSS v4, Shadcn UI |
| Backend         | Node.js via Next.js API Routes (Node runtime only — no Edge)   |
| Database & Auth | Supabase (PostgreSQL, RLS, Email + Password)                   |
| Caching         | Redis — `/api/teachers/available` only, not primary store      |
| AI/Matching     | Gemini 1.5 Pro + Claude 3.5 Sonnet (parallel agents)           |
| Testing         | Vitest + Playwright                                            |
| CI/CD           | GitHub Actions → Vercel                                        |
| Monitoring      | Sentry (errors + APM)                                          |
| Security        | CodeQL (SAST), Snyk (SCA), OWASP ZAP (DAST)                    |

---

## File Structure

```
/app
  /api              — API routes (all server-side)
  /(auth)           — login/signup
  /(parent)         — parent pages
  /(teacher)        — teacher pages
/components
  /ui               — Shadcn UI base components
  /features         — feature business logic components
/lib
  /supabase         — Supabase client
  /redis            — Redis client
  /ai               — matching logic + eval logging
  /validations      — Zod schemas (single source of truth)
/types              — shared TypeScript types
/docs
  /sessions         — session logs (EXPLORE_*, PLAN_*, IMPLEMENT_*)
  PRD.md            — product requirements
  API.md            — API documentation
```

---

## Database Schema

```
users        — id, email, role (parent | teacher)
teachers     — id, user_id, classroom, bio, created_at
availability — id, teacher_id, start_date, end_date, is_booked
children     — id, parent_id, classroom, age
bookings     — id, parent_id, teacher_id, start_date, end_date, status (pending | confirmed | declined)
match_evals  — id, parent_id, ranked_teachers (json), judge_score, created_at
```

---

## Architecture Decisions

- All API routes in `/app/api` — no microservices
- All data access via Supabase client — no raw SQL or separate ORM
- RLS policies required on every table before API exposure
- All AI calls server-side via `/api/match` — never from client
- Node.js runtime only — Edge runtime incompatible with Supabase/Redis/AI SDKs

---

## Critical Data Flows

**Booking:** Search → AI ranks → Parent requests → `pending` → Teacher confirms/declines → status updated

**AI Matching:** `/api/match` → Gemini + Claude in parallel → first response returned → logged to `match_evals` → LLM-as-judge scores async (0–10)

Judge prompt: _"Given this parent's needs and these teachers, is the ranking reasonable? Score 0-10 with reasoning."_

---

## Conventions

**Naming:** `kebab-case.tsx` components · `camelCase.ts` libs · `PascalCase` React components

**TypeScript:** No `any`. Zod for all API input validation.

**Git:** Branches `feature/[issue-id]-[slug]` · Commits `feat: #[id] desc` · PRs use "Closes #[id]" · Never push to `main` directly

**Testing:** TDD (write tests first) · Vitest for unit/integration · Playwright for E2E · Mock all Supabase + AI calls · >80% coverage via CI · Use `fast-check` for complex logic (AI ranking, validation, permissions)

**TDD Workflow:** RED (write failing tests → confirm fail → `test(RED): ...`) → GREEN (min implementation → `feat(GREEN): ...`) → REFACTOR (improve code → `refactor(REFACTOR): ...`)

---

## Session Logging Workflow

**When:** After exploration/planning/major implementations · Before `/compact` when context full

**Format:** `docs/sessions/[TYPE]_[date/task].md` where TYPE = EXPLORE (findings, decisions, next steps) | PLAN (requirements, design, steps) | IMPLEMENT (what built, decisions, course corrections, git history, test results, next recommendations)

**Context management:** Suggest `/compact` and summarize to file when full · For large features: write `PLAN_*.md` → `/clear` → re-read plan → implement with clean context

---

## CI/CD

| Workflow       | Trigger                       | Jobs                |
| -------------- | ----------------------------- | ------------------- |
| `ci.yml`       | Push to `feature/**`          | lint → test → build |
| `security.yml` | Push to `feature/**` + weekly | CodeQL, Snyk        |
| `deploy.yml`   | Merge to `main`               | Vercel deploy       |

Branch protection enforced. Secrets in GitHub Actions + Vercel dashboard only — never committed.

---

## Monitoring & Performance (Sentry)

- Instrument all API routes for errors + performance
- Alert on error spikes and p95 > 500ms (general) / > 1000ms (`/api/match`)
- Never swallow errors silently

---

## Security

- Parameterized queries only — no raw SQL interpolation
- RLS + role checks on every route
- No `dangerouslySetInnerHTML` · No stack traces to client · Sanitize input before AI calls
- Block merge on High/Critical CodeQL or Snyk findings
- OWASP ZAP passive scan on every Vercel preview deploy

---

## Do's and Don'ts

✅ **Do:** Use Shadcn before custom UI · Log `/api/match` I/O to `match_evals` · Cache with Redis (5min TTL) · Store secrets in GitHub/Vercel env only · Fix High/Critical security findings before merge · **Run tests and confirm RED before implementing** · **Write tests BEFORE implementation (strict TDD)** · **Use `fast-check` for complex logic** · **Document sessions to `docs/sessions/` before `/compact`** · **Suggest `/compact` proactively**

🚫 **Don't:** AI calls from client · Skip RLS policies · Use `any` in TypeScript · Magic link/OAuth (email+password only) · Commit `.env*` files · Expose internal errors/stack traces · Merge with open security findings · **Write logic without tests** · **Skip RED confirmation** · **Use only example-based tests for complex logic**
