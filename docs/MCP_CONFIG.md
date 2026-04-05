# MCP Integration — Setup Guide & Configuration

**Course:** CS780 · HW5: Custom Skill + MCP Integration
**Project:** TeachSitter
**Date:** 2026-03-31

---

## Overview

This document covers the two MCP servers integrated into the TeachSitter Claude Code
workflow, how they are configured, and a reproducible setup guide for TAs.

---

## Configured MCP Servers

| MCP Server         | Purpose                                         | Tool Prefix          |
| ------------------ | ----------------------------------------------- | -------------------- |
| **GitHub MCP**     | Read issues, post comments, inspect repo state  | `mcp__github__*`     |
| **Playwright MCP** | Browser automation, screenshots, DOM inspection | `mcp__playwright__*` |

---

## Configuration Snippet

MCP servers are registered in `~/.claude/settings.json` (global, shared across projects)
or in `.claude/settings.json` (project-scoped). The TeachSitter project uses the global
config so the same GitHub token works across all course repos.

```json
// ~/.claude/settings.json  (add the "mcpServers" key alongside existing config)
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-PAT-with-repo+issues scope>"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

> **Token scope required for GitHub MCP:** `repo`, `issues:write`, `pull_requests:write`

---

## TA Setup Guide (Reproducible Steps)

### Prerequisites

- Node.js ≥ 18 and npm installed
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- A GitHub Personal Access Token (classic or fine-grained)

### Step 1 — Install GitHub MCP server

```bash
# Verify the package resolves (no install needed — npx handles it at runtime)
npx -y @modelcontextprotocol/server-github --help
```

### Step 2 — Install Playwright MCP server

```bash
# Playwright MCP requires browser binaries
npx -y @playwright/mcp@latest --help
npx playwright install chromium   # install browser once
```

### Step 3 — Add mcpServers to Claude Code settings

```bash
# Open global settings
claude settings edit   # opens ~/.claude/settings.json in $EDITOR
```

Paste the JSON snippet from the **Configuration Snippet** section above.
Replace `<your-PAT-with-repo+issues scope>` with your actual token.

### Step 4 — Verify MCP health

```bash
claude mcp list
# Expected output:
#   github:     connected ✓
#   playwright: connected ✓
```

### Step 5 — Run the demo workflow

```bash
cd /path/to/CS780_TeachSitter
npm run dev &          # start local dev server (port 3000)
claude                 # open Claude Code
# Then follow the execution log in docs/sessions/IMPLEMENT_2026-03-31_hw5-mcp-demo.md
```

---

## Tool Decision Matrix

Claude autonomously selects tools using this logic:

```
Task type?
├── "Read/write GitHub state (issues, PRs, comments)"
│     → GitHub MCP  [authoritative remote source, no browser needed]
├── "Inspect UI, screenshot, assert DOM"
│     → Playwright MCP  [only tool that can see rendered output]
├── "Generate fix plan from issue context"
│     → /issue-plan skill  [custom skill, parallel codebase exploration]
└── "Local file read/edit/test"
      → Native Claude Code tools (Read, Edit, Bash)
```

---

## Permissions Added to `.claude/settings.json`

The following Bash permissions were added to support MCP-adjacent CLI fallback:

```json
"Bash(gh issue *)",
"Bash(gh pr *)",
"Bash(npx playwright *)"
```

---

## Troubleshooting

| Symptom                         | Fix                                                                    |
| ------------------------------- | ---------------------------------------------------------------------- |
| `github: needs authentication`  | Check `GITHUB_PERSONAL_ACCESS_TOKEN` env var in settings               |
| `playwright: browser not found` | Run `npx playwright install chromium`                                  |
| `mcp server timeout`            | Increase timeout: add `"timeout": 30000` to the server config object   |
| GitHub MCP can't find repo      | Ensure token has `repo` scope; check `GITHUB_REPOSITORY` env if needed |
