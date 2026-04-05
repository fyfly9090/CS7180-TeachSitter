---
description: Fetch a GitHub issue, explore the codebase, then produce an implementation plan
argument-hint: <issue-number>
---

# Issue → Explore → Plan

Issue number: $ARGUMENTS

**Repo:** fyfly9090/CS7180-TeachSitter

---

## Step 1: Fetch the Issue

Use the `mcp__github__get_issue` tool with:

- `owner`: `fyfly9090`
- `repo`: `CS7180-TeachSitter`
- `issue_number`: $ARGUMENTS

Then display the issue in this structured format:

**#[number] — [Title]**

| Field     | Value                       |
| --------- | --------------------------- |
| State     | open / closed               |
| Labels    | comma-separated label names |
| Milestone | milestone title             |
| Assignees | logins, or "unassigned"     |

**User Story**

> (quote the "As a …" sentence from the body, or "none" if absent)

**Description**
(the narrative description from the body)

**Acceptance Criteria**
(the checklist items from the body, rendered as a markdown checklist)

**Linked Issues / PRs**
(any issue or PR numbers mentioned in the body, or "none")

---

## Step 2: Explore the Codebase

Based on the issue title and body, launch **2–3 Explore agents in parallel**, each targeting a different angle relevant to the issue. Choose from:

- Trace the data flow or API route most affected by the issue
- Find existing patterns or components the fix/feature should follow
- Identify tests, schemas, or types that will need updating

Each agent should return a list of **5–10 key files** to read.

After agents complete, **read every file they identify** to build full context.

---

## Step 3: Summarize Findings

Present a concise summary:

- What the issue is asking for
- Which files/modules are affected
- Existing patterns to follow
- Constraints or risks to be aware of

---

## Step 4: Produce an Implementation Plan

Use the **Plan agent** to design the implementation. The plan should include:

1. **Approach** — what will be built or changed and why
2. **TDD steps** — RED tests to write first, then GREEN implementation targets
3. **Files to create or modify** — with a one-line description of each change
4. **Acceptance criteria** — how to verify the issue is resolved
5. **Out of scope** — what this plan deliberately does not cover

Present the plan and ask the user for approval before any code is written.
