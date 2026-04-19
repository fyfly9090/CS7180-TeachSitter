# TeachSitter Demo Video Script

**Target length:** ~10 minutes
**Team:** Yun Feng + Zixin Lin
**Format:** Walkthrough of the project — not just features, but how it was built, challenges, AI usage, and collaboration.
**Split (equal, ~5 min each):**

- **Yun — Sections 1–3 (~5 min):** Introduction, Live App Walkthrough, Architecture & Tech Stack.
- **Zixin — Sections 4–9 (~5 min):** AI Matching, Testing & CI/CD, Security, How We Used AI in Development, Challenges, Wrap-Up.
- Introduction delivered solo by Yun. Wrap-up delivered solo by Zixin.

---

## SECTION 1: Introduction (45 sec) — _Yun_

**[Yun on camera]**

**Yun:**

> Hi everyone. I'm Yun Feng, and with my teammate Zixin Lin, I'll walk you through TeachSitter project.

> When preschools close for winter, spring, or summer break, working parents scramble to find childcare. Their child's own teacher is often available and looking for extra income — but there's no easy way to connect them. TeachSitter is a web app that fixes that: teachers post availability, parents search and get AI-ranked recommendations, then book the familiar teacher.

> I'll take the first half — a live demo and the architecture behind it. Zixin will take the second half — AI matching, testing and CI/CD, security, how we used AI to build the app, and the wrap-up.

---

## SECTION 2: Live App Walkthrough (2 min 45 sec) — _Yun_

**[Screen share — browser on the deployed app or localhost:3000]**

### 2a. Landing Page (15 sec)

**Yun:**

> Here's our landing page — Next.js 16, Tailwind v4, Material Design 3 color tokens. Sign up as Parent or Teacher. Let's start with the teacher side.

### 2b. Teacher Flow (1 min)

**[Sign up as teacher or log in as test teacher]**

**Yun:**

> On signup, teachers land on the setup page — classroom name like "Green Room," a short bio, expertise tags, and date ranges they're available.

**[Show setup page → fill form → save]**

> Here's the teacher dashboard: availability blocks on top, booking requests below. Tap Confirm or Decline to respond.

**[Navigate to requests page → show a pending request → confirm it]**

### 2c. Parent Flow (1 min 30 sec)

**[Log in as test parent]**

**Yun:**

> Switching to the parent side. The dashboard shows their children — name, age, classroom, care notes — and active booking requests with status badges.

**[Show dashboard → children list → active requests]**

> The core feature is search. Enter a date range and optionally a classroom; the app queries a Redis-cached API and returns matching teachers.

**[Navigate to search → enter dates → show results]**

> As soon as the results come back, the app fires off `/api/match` automatically in the background — no button, no extra click. Gemini 1.5 Pro scores each teacher with classroom familiarity as the primary signal: if the child is in Sunflower Room, Sunflower teachers rank highest. The ranking lands on the page as two visible artifacts on every card — a `#1 Match` / `#2 Match` badge in the top-right of the teacher's photo, and an "AI Match Reasoning" box under the bio explaining why.

**[Point out the #1 Match / #2 Match badges on the photos and the AI Match Reasoning boxes under each bio]**

> From here, the parent opens a teacher's profile and sends a booking request with a personal message. The request goes to "pending" — and once the teacher confirms, it flips to "confirmed."

**[Click teacher profile → click "Request" → submit → show status update]**

---

## SECTION 3: Architecture & Tech Stack (1 min 30 sec) — _Yun_

**[Show architecture diagram or the tech stack table from CLAUDE.md]**

**Yun:**

> Quick tour of the stack. Full-stack Next.js 16 with App Router and React 19 — frontend and backend in the same project, no separate server.

> Database is Supabase — hosted Postgres with built-in auth. Every table has Row-Level Security, so even if someone hits our API directly, the database enforces that parents only see their own children and teachers only modify their own availability.

> Six tables: `users`, `teachers`, `availability`, `children`, `bookings`, and `match_evals`. Redis caches teacher search results with a 5-minute TTL — fail-open, so if Redis goes down the app still works.

> Every API route validates input with Zod and runs through a centralized `withApiHandler` wrapper that reports to Sentry without leaking stack traces.

> With that foundation in mind — I'll hand over to Zixin to cover the AI matching system and everything that keeps the app honest.

---

## SECTION 4: AI Matching — The Core Feature (1 min 15 sec) — _Zixin_

**[Show `lib/ai/gemini.ts` and `lib/api/match.ts` in editor]**

**Zixin:**

> Thanks Yun. The AI matching system is the heart of TeachSitter. When a parent searches, we send the available teachers plus the child's classroom to `/api/match`.

> The design is a parallel AI race. We call Gemini 1.5 Pro with a structured prompt — "rank these teachers, prioritize classroom familiarity" — and ask for JSON: teacher IDs, ranks, and human-readable reasoning. If Gemini fails, we fall back to a deterministic same-classroom-first ranking, so the user always gets a result.

> The interesting part is the eval system. Every match call logs input and output to `match_evals`. Asynchronously, a "judge" — another Gemini call — scores the ranking from 0 to 10 with reasoning. It's an LLM-as-judge pattern, and it gives us a built-in quality metric. Our target is an average judge score of 7 or above.

> We also have the Anthropic SDK wired in for Claude 3.5 Sonnet as a second racer — that's in progress, but the architecture supports it.

---

## SECTION 5: Testing & CI/CD (1 min 15 sec) — _Zixin_

**[Show test output in terminal, then GitHub Actions]**

**Zixin:**

> We followed strict TDD — RED, GREEN, REFACTOR. Write the failing test, confirm it fails, implement the minimum to pass, then clean up. Each phase gets its own commit.

**[Run `npm run test` — show output]**

> Over 380 passing Vitest tests covering API routes, validation, middleware auth, React pages, and error handling. For date logic we used property-based testing with fast-check — it caught a NaN-date edge case that no example-based test would have found. Playwright covers the end-to-end flows — signup, teacher setup, and booking — against a real Supabase instance.

> CI runs on every push to a feature branch: lint, then test with coverage, then build. PRs to main also get an AI code review via Claude Code Action, and a separate workflow runs CodeQL and npm audit on every push plus weekly. Deploys go through Vercel — previews on PRs, production on merge to main.

---

## SECTION 6: Security (30 sec) — _Zixin_

**[Briefly show security workflow or RLS policies]**

**Zixin:**

> Four layers of security: Row-Level Security on every table, Zod validation on every API input, CodeQL scanning for things like XSS, and eslint-plugin-security at pre-commit. One concrete example: CodeQL flagged user-supplied dates going into URLs without encoding — a potential XSS vector. We fixed it with `encodeURIComponent` everywhere. Policy: fix the code, never dismiss the alert.

---

## SECTION 7: How We Used AI in Development (45 sec) — _Zixin_

**[Show Claude Code in terminal or VS Code]**

**Zixin:**

> We didn't just build an AI feature — we used AI to build the app. Claude Code was our primary development tool, acting as a pair programmer: we'd describe what we needed, it would write the failing test, implement the route, and iterate. We reviewed every line.

> We set up Claude Code hooks for pre-commit checks, and MCP servers for GitHub and Playwright. Over the project, Claude Code produced around 162 commits across 20+ branches, all through our lint-test-review pipeline. Over 25 session logs in `docs/sessions/` document every major decision.

> The takeaway: AI accelerated us enormously, but it didn't replace engineering judgment — architecture, security, edge cases, trade-offs were still on us.

---

## SECTION 8: Challenges & Lessons Learned (30 sec) — _Zixin_

**[Zixin on camera]**

**Zixin:**

> A few things that tripped us up. Supabase RLS is powerful but tricky — we needed a service-role client for cross-user queries like joining teacher profiles. React Testing Library with async data caused race conditions — `waitFor` and `act` had to be carefully sequenced. And we once committed a Playwright report directory, which dropped 2,953 lint errors into CI in a single push. Lesson: check `.gitignore` before merging.

---

## SECTION 9: Wrap-Up (30 sec) — _Zixin_

**[Zixin on camera]**

**Zixin:**

> To wrap up: TeachSitter is a full-stack Next.js app with AI-ranked teacher matching, backed by Supabase with RLS, Redis caching, Sentry monitoring, and a CI/CD pipeline with automated security scanning. We followed TDD throughout, used property-based testing, and built an eval system to track AI quality over time — all with Claude Code as an accelerator, and full transparency through session logs.

> Thanks for watching.

---

## Production Notes

- **Total target time:** ~10 minutes
- **Equal split:** Yun ≈ 5 min (Sections 1–3) · Zixin ≈ 5 min (Sections 4–9).
- **Solo presenters:** Intro is Yun alone. Wrap-up is Zixin alone. Single clean handoff at the end of Section 3.
- **Handoff cue:** End of Section 3 — Yun says "I'll hand over to Zixin." Zixin opens Section 4 with "Thanks Yun."
- **Screen share sections:** 2 (app demo), 3 (architecture), 4 (AI code), 5 (tests/CI), 6 (security), 7 (Claude Code)
- **On-camera sections:** 1 (intro), 8 (challenges), 9 (wrap-up)
- **Tip:** Pauses and natural moments are fine — focus on telling the story.
- **Tip:** For the live demo, use pre-seeded data to avoid empty states.
- **Tip:** Keep the terminal font size large (16pt+) for readability on video.
