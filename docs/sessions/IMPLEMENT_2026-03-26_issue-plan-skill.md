# IMPLEMENT — issue-plan Slash Command Skill

**Date:** 2026-03-26
**Branch:** feature/5-sentry-monitoring
**Type:** Tooling / Developer Experience

---

## What Was Built

A project-level Claude Code slash command skill at `.claude/commands/issue-plan.md`.

**Usage:** `/issue-plan <issue-number>`

The skill automates the explore → plan workflow for any GitHub issue in this repo. It runs in 4 steps:

1. **Fetch** — calls `mcp__github__get_issue` for `fyfly9090/CS7180-TeachSitter` with the supplied issue number; extracts title, body, labels, assignees, linked issues
2. **Explore** — launches 2–3 parallel Explore agents, each targeting a different angle of the codebase relevant to the issue (data flow, existing patterns, tests/schemas); each agent returns 5–10 key files
3. **Summarize** — reads every file the agents surface, then presents a concise findings summary (affected modules, patterns to follow, risks)
4. **Plan** — uses a Plan agent to produce a TDD-oriented implementation plan (approach, RED/GREEN steps, files to create/modify, acceptance criteria, out-of-scope); waits for user approval before any code is written

---

## Decisions

- **Project-level, not global** — placed in `.claude/commands/` so it is scoped to this repo and can be committed with the codebase.
- **MCP over `gh` CLI** — uses `mcp__github__get_issue` directly rather than a bash `gh issue view` call, since MCP tools are available in-session and don't require a separate shell permission.
- **Parallel Explore agents** — mirrors the pattern used in `/feature-dev` to maximize codebase coverage without serializing work.
- **Plan agent gated on approval** — consistent with CLAUDE.md convention of not writing code without explicit user sign-off on the plan.

---

## Files Created

| File                             | Description                                              |
| -------------------------------- | -------------------------------------------------------- |
| `.claude/commands/issue-plan.md` | Slash command definition — fetch, explore, plan workflow |

---

## Course Corrections

- Initial invocation attempt (`/issue_plan`, `/issue-plan`) returned "Unknown skill" — this is expected until Claude Code re-indexes the commands directory. No code change needed; the file is correctly placed.

---

## Git History (session)

No commits made this session — the skill file is uncommitted on `feature/5-sentry-monitoring`.

---

## Next Recommendations

1. **Commit the skill** — `git add .claude/commands/issue-plan.md && git commit -m "feat: add /issue-plan slash command skill"`
2. **Reload Claude Code** — restart the session or use `/reload` so the new command is picked up by the indexer
3. **Test it** — run `/issue-plan 5` (the current Sentry issue) to verify the full fetch → explore → plan flow
4. **Consider a global variant** — if the explore→plan pattern is useful across projects, promote the command to `~/.claude/commands/`

---

## Update — 2026-03-26 (Issue Display Enhancement)

### What Changed

Updated Step 1 of `.claude/commands/issue-plan.md` to display a structured issue breakdown immediately after fetching, before the explore phase begins.

**Before:** Step 1 only said to "extract and display: title, body, labels, assignees, milestone, linked issues."

**After:** Step 1 now instructs Claude to render a formatted output with:

- A metadata table (state, labels, milestone, assignees)
- Quoted user story (the "As a …" sentence)
- Narrative description section
- Acceptance criteria rendered as a markdown checklist
- Linked issues/PRs section

### Why

When `/issue-plan 6` was invoked, the issue details were not surfaced clearly before diving into the explore phase. The user wanted to see a complete, readable breakdown of the issue (title, user story, description, acceptance criteria, etc.) so they can verify the right issue was fetched and review requirements before codebase exploration begins.

### Files Modified

| File                             | Change                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `.claude/commands/issue-plan.md` | Expanded Step 1 output format with structured table + named sections |
