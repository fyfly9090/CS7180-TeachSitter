# Parallel Development via Git Worktrees

This directory documents parallel feature development using `git worktree`.

## What are Git Worktrees?

Git worktrees allow checking out multiple branches simultaneously in separate directories. This enables true parallel development — working on two features at the same time without switching branches.

## Parallel Development Evidence

Two features were developed in parallel on 2026-04-03:

| Worktree     | Branch                        | Feature                                               | PR  |
| ------------ | ----------------------------- | ----------------------------------------------------- | --- |
| `e2e-tests/` | `feature/e2e-tests`           | Playwright E2E tests for auth, teacher, booking flows | #35 |
| `issue-10/`  | `feature/10-teacher-requests` | Teacher booking requests page (Issue #10)             | #36 |

Both branches fork from `main` at the same commit (`159d6da`), with overlapping commit timestamps visible in `git log --all --graph`.

## Commands Used

```bash
# Create worktrees from main
git worktree add .claude/worktrees/e2e-tests -b feature/e2e-tests main
git worktree add .claude/worktrees/issue-10 -b feature/10-teacher-requests main

# Work in each worktree independently
cd .claude/worktrees/e2e-tests    # write E2E tests, commit, push
cd .claude/worktrees/issue-10     # implement issue #10, commit, push

# Verify parallel history
git log --all --oneline --graph feature/e2e-tests feature/10-teacher-requests
```

## Git Graph (parallel branches visible)

```
*   65ae259 Merge pull request #36 (feature/10-teacher-requests)
|\
| * 0933870 docs(IMPLEMENT): #10 session log
| * bcd0b7c feat(GREEN): #10 requests page
| * 476d7c6 test(RED): #10 unit tests
| * 7f3e918 feat: #10 teacher layout
| * f0c038c docs(PLAN): #10 plan
| * 9b1b7fc docs(EXPLORE): #10 explore
* |   a6bb7fc Merge pull request #35 (feature/e2e-tests)
|\ \
| |/
| * d13be6e fix(e2e): review fixes
| * e64000f docs(IMPLEMENT): E2E session log
| * e2d4342 test(e2e): booking flow
| * fdde3c8 test(e2e): teacher dashboard + setup
| * 556c7d2 test(e2e): auth pages
|/
* 159d6da (common ancestor — main)
```
