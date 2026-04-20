# IMPLEMENT — Combined Technical Blog Post

**Date:** 2026-04-20
**Branch:** `docs/combined-blog-post`
**Task:** Merge `docs/blog-post-yun.md` and `docs/blog-post-zixin.md` into a single cohesive technical blog post.

## What was built

- Created `docs/blog-post.md` — a unified 11-section technical blog post co-authored by Yun Feng and Zixin Lin.
- Removed the two individual posts (`blog-post-yun.md`, `blog-post-zixin.md`) so there is a single canonical post going forward.

## Structure of the combined post

1. System Architecture (Mermaid diagram, shared overview)
2. Trust Layer — middleware, RLS, Sentry (Yun)
3. Teacher Experience — API, setup, dashboard (Yun)
4. Parent Search — split-render UX (Zixin)
5. AI Matching Pipeline — parallel race, eval logging, judge (Zixin)
6. Booking Flow — three-page state machine (Zixin)
7. Testing — E2E worktrees + strict TDD
8. Security as a Checklist
9. Quality Gates and the Claude Code Workflow (hooks + Writer/Reviewer + issue-plan + MCP)
10. CI/CD Pipeline
11. What We'd Do Next
12. Closing Thoughts

## Key decisions

- **Architecture diagram up front.** Zixin's Mermaid diagram was section 5 in her post; it now opens the combined post so a reader sees the full system map before diving into either half.
- **Joint voice with attribution.** Default to "we" for shared observations; switch to "Yun built X" / "Zixin followed Y" only where individual ownership is load-bearing.
- **De-duplicated Claude Code content.** Yun's "hooks" section and Zixin's "developing with Claude Code" section were merged into a single section 9 to avoid overlap.
- **Unified "What's Next."** Both posts ended with their own forward-looking lists; merged into three concrete items (DB-layer overlap check, Supabase Realtime integrations, tighter eval feedback loop).
- **`flowchart TD` fixed.** The original diagram used `GEM & CLA -->` shorthand twice, which Mermaid's strict parser handles inconsistently across renderers; split into explicit single-source edges for robustness.

## Verification

- `npx prettier --check docs/blog-post.md` — clean.
- Section numbering, headings, and internal references all consistent.

## Next recommendations

- Add a companion hero image or architecture SVG if the post is published externally.
- Consider a shorter executive summary or TL;DR at the top for the non-engineering audience.
