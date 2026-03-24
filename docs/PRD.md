# Product Requirements Document — TeachSitter

**Version:** 1.0
**Team:** Yun, Teammate
**Last Updated:** March 2026

---

## Problem Statement

Working parents of preschool-aged children face a recurring, predictable childcare gap during school breaks — winter, spring, summer, and Thanksgiving. Existing solutions (daycare, babysitting apps, family) are either unavailable during closures or unfamiliar to the child. Preschool teachers, who already know the children and their needs, are a natural fit for break-time childcare but have no dedicated platform to offer their availability. TeachSitter closes this gap by connecting preschool families with their own school's teachers for trusted, familiar childcare during closures.

---

## User Personas

**Parent Patricia**

- Working mother of a 4-year-old preschooler
- Needs reliable childcare during school breaks
- Prefers someone her child already knows and trusts
- Not highly technical — expects a simple, clear interface

**Teacher Tara**

- Preschool teacher looking to earn extra income during breaks
- Comfortable babysitting a small number of familiar children
- Wants to control her own schedule and confirm bookings on her terms

---

## User Stories

**Teacher**

- As a teacher, I want to register and create a profile, so parents can learn about my background and classroom.
- As a teacher, I want to post my available date ranges during school breaks, so parents know when I can babysit.
- As a teacher, I want to confirm or decline booking requests, so I can manage my schedule on my own terms.

**Parent**

- As a parent, I want to register and add my child's classroom and age, so the app can find relevant teacher matches.
- As a parent, I want to search for available teachers by date range, teacher name, or my child's classroom, so I can find the best fit.
- As a parent, I want to see an AI-ranked list of matched teachers with reasoning, so I can make a confident, informed decision.
- As a parent, I want to send a booking request to a teacher, so I can reserve their time for the break period I need.
- As a parent, I want to see the status of my booking requests, so I know whether a teacher has confirmed or declined.

---

## Feature Specs

### 1. Authentication

- Email + password signup and login via Supabase
- Role selection at signup: Parent or Teacher
- Protected routes based on role

### 2. Teacher Profile & Availability

- Teacher fills out profile: name, classroom, bio
- Teacher posts availability as date ranges (start date, end date)
- Teacher can edit or remove availability entries

### 3. Parent Search

- Search by date range, teacher name, or child's classroom
- Results show available teachers with profile summaries
- AI-ranked results surfaced at the top with match reasoning

### 4. AI Matching

- `POST /api/match` accepts parent requirements and available teacher profiles
- Runs Gemini 1.5 Pro and Claude 3.5 Sonnet in parallel — returns first successful response
- Primary ranking signal: same classroom as child
- Secondary signals: availability overlap, profile completeness
- Returns ranked list with per-teacher reasoning

### 5. Booking Flow

- Parent sends booking request (date range, message)
- Teacher receives request and confirms or declines
- Booking status visible to both parties (pending / confirmed / declined)

### 6. Eval System

- Every `/api/match` call logs input + output to `match_evals` table
- LLM-as-judge scores each match asynchronously (0–10)
- Admin/metrics dashboard shows average judge score over time

---

## Functional Requirements & Data Flow

### Booking Flow

```
Parent searches → AI ranks teachers → Parent selects teacher
→ Booking request created (status: pending)
→ Teacher confirms/declines → Status updated
→ Parent notified of outcome
```

### AI Matching Flow

```
Parent submits search → /api/match called server-side
→ Gemini + Claude run in parallel
→ First successful response returned
→ Ranked list shown to parent
→ Input/output logged to match_evals
→ LLM-as-judge scores result asynchronously
```

### Key Data Relationships

```
users          → role determines parent or teacher access
teachers       → linked to users via user_id
availability   → linked to teachers via teacher_id
children       → linked to parents via parent_id
bookings       → links parent_id + teacher_id, tracks status
match_evals    → logs every AI match call and judge score
```

---

## MoSCoW Prioritization

### Must Have

- Email + password auth with role-based access
- Teacher profile and availability posting
- Parent search by date, name, and classroom
- Booking request and confirm/decline flow
- AI-powered teacher ranking via `/api/match`
- Eval logging to `match_evals`

### Should Have

- LLM-as-judge async scoring
- Booking status visibility for both parties
- Redis caching for availability search results
- CI/CD pipeline with GitHub Actions

### Could Have

- Metrics dashboard for eval scores
- Email notifications on booking status change
- Teacher rating/review after babysitting session

### Won't Have (this sprint)

- Payment processing
- In-app messaging
- Mobile native app
- Multi-school support

---

## Success Metrics

| Metric                       | Target   |
| ---------------------------- | -------- |
| AI match judge score (avg)   | ≥ 7 / 10 |
| Booking confirmation rate    | ≥ 60%    |
| Search-to-request conversion | ≥ 40%    |
| Test coverage                | ≥ 80%    |
| CI pipeline pass rate        | ≥ 95%    |
| API response time (p95)      | ≤ 500ms  |
