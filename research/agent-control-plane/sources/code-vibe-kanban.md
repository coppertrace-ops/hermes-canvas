# Source: Vibe Kanban (Bloop AI)

**Accessed:** 2026-07-13

## PRIMARY

**GitHub — https://github.com/BloopAI/vibe-kanban** (confidence: high)
- Tagline: "Get 10X more out of Claude Code, Codex or any coding agent"
- "Plan with kanban issues — create, prioritise, and assign issues on a kanban board"
- "Run coding agents in workspaces — each workspace gives an agent a branch, a terminal, and a dev server"
- "Review diffs and leave inline comments — send feedback directly to the agent without leaving the UI"
- "open PRs with AI-generated descriptions, review on GitHub, and merge"
- "Preview your app — built-in browser with devtools, inspect mode, and device emulation"
- "Switch between 10+ coding agents — Claude Code, Codex, Gemini CLI, GitHub Copilot, Amp, Cursor, OpenCode, Droid, CCR, and Qwen Code"
- License: **Apache-2.0** (open source, free / BYO agent). Runs locally (Rust/React desktop app).
- Status note on repo: "Vibe Kanban is sunsetting."

**Site — https://vibe-kb.com/** (confidence: med)
- "Free parallel AI coding (Claude, Cursor, Copilot, Gemini)"

## ANECDOTE

- Eleanor Berger teardown (elite-ai-assisted-coding.dev) and Starlog articles (starlog.is) describe git-worktree-per-task isolation; label anecdote. (confidence: med)
- Search-surfaced claim: "Bloop … announced a shutdown in early 2026, though the project continues as open source and community-maintained." (confidence: med, secondary)

## READ

- Kanban BOARD = mission-control over many tasks/runs. Live state = kanban columns (To do / In Progress / Done) + per-workspace terminal + dev server. Human controls = inline diff comments, PR open/merge. It gives each agent "a terminal" — review is diff-based but execution surface is a terminal per workspace (partial scrape). Provenance = branch + diff + PR. Structured events: partial (diffs/PRs structured; agent I/O is terminal).
