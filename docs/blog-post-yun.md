# Building the Teacher Side of TeachSitter — Trust, Flow, and the Guardrails Behind Them

_Author: Yun Feng_

TeachSitter is a two-sided marketplace that connects preschool parents with their own child's teacher for babysitting during school breaks. My teammate Zixin Lin and I split the product down the middle — she took the parent-facing search and AI-matching half; I took everything the teacher sees, plus the foundations that keep the whole app honest: auth routing, row-level security, observability, end-to-end tests, and the Claude Code hooks that enforce quality on every commit.

This post is a tour of those pieces and why they look the way they do.

## 1. The trust layer: middleware, RLS, Sentry

A marketplace lives or dies by whether users can only see and do what they're allowed to. I built that in three layers.

**Route protection middleware.** Next.js 15 App Router lets you put a single `middleware.ts` at the edge of every request. Mine reads the Supabase SSR session, pulls `role` from `user.user_metadata`, and enforces three rules: unauthenticated users hitting `/dashboard`, `/search`, `/bookings`, `/profile`, or `/teacher/*` get redirected to `/login`; parents landing on `/teacher/*` bounce to `/dashboard`; teachers landing on parent routes bounce to `/teacher/dashboard`. API routes under `/api/*` (except `/api/auth/*`) return `401` instead of redirecting, so the client can handle it cleanly. The unit tests cover all three states — anonymous, parent, teacher — because getting this wrong is how you leak data.

**RLS smoke tests and schema verification.** Middleware can be bypassed; the database cannot. Every one of the six tables — `users`, `teachers`, `availability`, `children`, `bookings`, `match_evals` — has RLS enabled with policies that enforce, for example, "a teacher can only update `bookings` where `teacher_id = auth.uid()`" and "`match_evals` is write-only for authenticated users, read-only for service role." I wrote integration smoke tests that log in as different users and assert each policy actually blocks cross-user reads and writes. Plus a seed script (`npm run db:seed`) that spins up two parents, three teachers, availability blocks, and one booking each, so local dev never starts from zero.

**Sentry.** Errors and slow paths needed to surface without grepping logs. I integrated `@sentry/nextjs` with both `sentry.client.config.ts` and `sentry.server.config.ts`, and wired performance transactions into every API route via the existing `withApiHandler` wrapper in `lib/errors.ts`. Alert thresholds: error spikes, p95 > 500ms on general routes, p95 > 1000ms on `/api/match`. `SENTRY_DSN` lives in env only and is documented in `.env.example`.

## 2. The teacher experience, end-to-end

The teacher side is four pieces working together. The API and UI were built in parallel on separate feature branches, then stitched.

**Availability management API.** Four endpoints: `GET /api/teachers/[id]` loads profile plus availability; `PATCH /api/teachers/[id]` updates classroom/bio/expertise; `POST /api/teachers/[id]/availability` adds a block; `DELETE /api/teachers/[id]/availability/[avail_id]` removes one. Every input is validated with Zod — `start_date` and `end_date` as ISO 8601 strings, `end_date >= start_date`, `classroom` max 100 chars, `bio` max 1000. Every mutating route checks both `user.role === 'teacher'` and ownership (`teacher.user_id === auth.uid()`), so RLS is the second line of defense, not the first.

**Profile setup page.** `/teacher/setup` is a two-column layout — a profile form card on the left with a circular photo uploader, classroom input, bio textarea, and toggleable expertise pills (Art & Crafts, STEM Activities, Music & Dance, and four others); a sticky sidebar on the right for availability blocks. On submit it `PATCH`es the profile API. The form is required-by-default: you can't save without a classroom and at least one availability block, because an empty teacher profile is worse than no profile at all.

**Dashboard and Requests.** `/teacher/dashboard` shows a personalized greeting with an animated `animate-ping` availability dot, two stat cards (upcoming sessions, pending requests), and a grid: confirmed bookings on the left, a sticky pending-request sidebar with Accept/Decline buttons on the right. `/teacher/requests` is the deeper view — full booking history with a modal that opens parent info, child details, and a cancel-with-reason flow. Both pages do optimistic UI updates on Accept/Decline so the card moves or disappears before the server round-trip completes.

**Confirm/decline API.** `PATCH /api/bookings/[id]` takes `{ status: "confirmed" | "declined" }` and — the non-obvious part — flips the corresponding `availability.is_booked` to `true` when a booking is confirmed. That side effect is what keeps parent search honest: a teacher with two confirmed bookings stops showing up as available for those dates. Error shape: `400` invalid status, `401` anonymous, `403` not-the-teacher, `404` missing booking, all routed through `withApiHandler`.

## 3. End-to-end tests and parallel worktrees

Playwright, four spec files: auth rendering and navigation, teacher setup, teacher dashboard, parent booking flow (search → form). Each test spins up test users via the Supabase admin API and tears them down after. The more interesting thing here isn't the tests themselves but how they were written: I developed the E2E suite in parallel with the teacher-requests feature using git worktrees, which let me have both branches checked out simultaneously in separate directories. Running the dev server for the requests page while writing E2E tests against it — on the same machine, same Claude Code session, no branch-switching churn — cut iteration time dramatically.

## 4. Quality gates via Claude Code hooks

The last piece is meta: five hooks in `.claude/settings.json` that run automatically during agent work.

- **Pre-push gate** (`PreToolUse` on `Bash`): blocks any `git push` unless lint + test + build all pass.
- **Protected file guard** (`PreToolUse` on `Edit`): blocks edits to `.env*` and foundational migration files.
- **Secret file guard** (`PreToolUse` on `Write`): blocks writing new env files entirely.
- **Auto-format** (`PostToolUse` on `Edit`): Prettier runs on every `.ts/.tsx/.js/.jsx` touched.
- **Quality check** (`Stop`): the full test suite runs when Claude finishes a task.

Alongside the hooks, I shipped teacher UX polish — auto-login after signup with role-based redirect, a booking detail modal with a cancel-with-reason flow, a sign-out button in the teacher navbar, and a schema migration adding `full_name` to profiles with a Postgres trigger to keep it synced.

## What I'd do next

The teacher side is feature-complete, but I'd add two things before scaling: real-time updates to the dashboard via Supabase's Postgres changefeeds (so a new booking request animates in without a refresh), and a proper booking-overlap check in the `POST /api/bookings` path so double-booking the same dates fails at the API layer, not just via the `is_booked` flag. The bones are there; it's a day's work.
