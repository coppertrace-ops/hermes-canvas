# Source: Claude Squad + Crystal (terminal/desktop worktree managers)

**Accessed:** 2026-07-13

## PRIMARY — Claude Squad (smtg-ai)

**https://github.com/smtg-ai/claude-squad** (confidence: high)
- "Claude Squad is a terminal app that manages multiple Claude Code, Codex, Gemini (and other local agents including Aider) in separate workspaces."
- Mechanisms: "tmux to create isolated terminal sessions for each agent," "git worktrees to isolate codebases so each session works on its own branch," "a simple TUI interface."
- Review: "switch between preview tab and diff tab," "review changes before applying them, checkout changes before pushing them."
- Controls: "Commit and push branch to github," "Checkout. Commits changes and pauses the session," "Resume a paused session."
- License: **AGPL-3.0** (free, OSS). Install via `brew install claude-squad` (`cs`).

## PRIMARY — Crystal (stravu) → now Nimbalyst

**https://github.com/stravu/crystal** (confidence: high)
- "Run multiple Codex and Claude Code AI sessions in parallel git worktrees."
- "Test, compare approaches & manage AI-assisted development workflows in one desktop app."
- "Git worktree isolation for safer parallel AI coding sessions"; built-in rebase/squash; session persistence/resume. Electron desktop app.
- License: **MIT**. Status: "Crystal is now Nimbalyst"; original repo no longer actively developed (Feb 2026). Successor streams "edits directly into open editors in real time."

## READ

- Claude Squad = the CLEAREST "just tiles/scrapes terminals" case: it is explicitly tmux terminal sessions per agent in a TUI. Diff tab exists, but the run surface is a scraped terminal, not structured events. No web/mobile mission-control; single-machine TUI. Provenance = worktree/branch/diff/commit/push. BYO Claude, free/OSS. Buyer = indie/terminal-native devs.
- Crystal = same worktree-parallel model in an Electron GUI; diff compare across sessions; still agent-terminal driven. Deprecated → Nimbalyst.
