# OpenAI Codex — cloud tasks, parallel runs, provenance, human controls

Accessed: 2026-07-13
Confidence: high (learn.chatgpt.com / developers.openai.com official docs)

## PRIMARY — Codex cloud (developers.openai.com/codex/cloud → learn.chatgpt.com/docs/cloud)
- Codex Cloud lets developers "run coding tasks in parallel cloud environments" and delegate "from anywhere — whether on the web, GitHub, Linear, or Slack — without requiring their local machine."
- Isolated envs: "Each task runs in a dedicated cloud sandbox configured with specific dependencies, tools, and variables."
- Parallel: "Multiple tasks can run simultaneously without consuming local resources."
- Live state: "Users can watch task logs in real-time or let work progress in the background."
- Review/provenance + human controls: "Before merging, developers can inspect summaries, diffs, and test results, then request follow-ups or create pull requests."
- Surfaces: "complements other Codex surfaces including the desktop app, web interface, CLI, and IDE extension."

## PRIMARY — GitHub/PR review + task chaining (developers.openai.com/codex/integrations/github, /use-cases/github-code-reviews)
- "@codex review" in a PR comment → Codex reacts (👀) and "posts a review on the pull request just like a teammate would."
- "You can review the summary and diff, and then ask Codex to make follow-up changes, or open a pull request when the work is ready."
- Codex App: "after a worktree thread finishes, you can go from diff to open PR without leaving the App."
- Task context: "Codex creates a new task in the cloud that carries over the existing task context (including the plan and any local source changes)."
- Repo guidance via AGENTS.md; "Codex applies guidance from the closest AGENTS.md to each changed file."

## PRIMARY — usage dashboard (via /codex/pricing docs)
- "You can find your current limits in the Codex usage dashboard." (usage/limits dashboard, not a per-run mission-control grid.)

## Analysis
- Hosted-managed execution (OpenAI cloud sandboxes) w/ local↔cloud handoff; task list of parallel cloud tasks each with logs+diff+tests+PR. Structured (summaries/diffs), not raw terminal-scrape only.
- The "dashboard" surfaced officially is a USAGE/limits dashboard; the task list is the closest to multi-run mission-control.
