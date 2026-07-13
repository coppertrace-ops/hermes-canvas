# GitHub Agent HQ + Copilot Coding Agent + Mission Control

**Accessed:** 2026-07-13
**Confidence:** HIGH (primary GitHub blog + docs) unless labeled ANECDOTE.

## PRIMARY SOURCES

### 1. "Introducing Agent HQ: Any agent, any way you work" — GitHub Blog (announced GitHub Universe, ~Oct 28 2025)
URL: https://github.blog/news-insights/company-news/welcome-home-agents/
- "Coding agents from Anthropic, OpenAI, Google, Cognition, and xAI will be available on GitHub as part of your paid GitHub Copilot subscription."
- Mission control: "A unified command center that follows you wherever you work...lets you direct, monitor, and manage every AI-driven task."
- "Choose from a fleet of agents, assign them work in parallel, and track their progress from any device."
- Anthropic: "Claude can pick up issues, create branches, commit code, and respond to pull requests, working alongside your team."
- Google: "Jules becomes a native assignee..."
- VS Code: "Mission control is in VS Code, too, so you've got a single view of all your agents running in VS Code, in the Copilot CLI, or on GitHub."
- Governance: "Control plane—your agent governance layer. Set security policies, audit logging, and manage access all in one place."

### 2. "How to orchestrate agents using mission control" — GitHub Blog
URL: https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/
- "a unified interface for managing GitHub Copilot coding agent tasks"
- "assign tasks to Copilot across repos, pick a custom agent, watch real-time session logs, steer mid-run (pause, refine, or restart), and jump straight into the resulting pull requests—all in one place"
- "mission control centralizes assignment, oversight, and review"
- "Mission control lets you select custom agents that use agents.md files from your selected repo"
- Access point: github.com/copilot/agents

### 3. "Assigning and completing issues with coding agent" + Docs (cloud agent)
URL: https://github.blog/ai-and-ml/github-copilot/assigning-and-completing-issues-with-coding-agent/
URL: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent
- "creates a copilot/* branch from your default branch, pushes commits as it works, and opens a draft PR for you to review."
- "you'll see the agent's reasoning and validation steps in the session logs, making it easy to trace decisions"
- Restricted env w/ firewall; read-only repo access until it creates the copilot/* branch; only responds to write-access users.
- PRs arrive as drafts; workflows won't run until a human with write access approves; requester can't be the approver.

### 4. Pricing — GitHub Changelog
URL: https://github.blog/changelog/2025-07-10-github-copilot-coding-agent-now-uses-one-premium-request-per-session/
- "Copilot coding agent will now use exactly one Copilot premium request per session."
- Available on Copilot Pro, Pro+, Business, Enterprise; each plan includes a monthly premium-request allowance.
- Copilot Pro $10/mo, Pro+ $39/mo, Business $19/user/mo, Enterprise $39/user/mo (GitHub pricing page; confirm below).

## NOTE
Agent HQ is explicitly a CROSS-VENDOR mission control (Copilot + Claude + Codex + Jules + Devin + xAI) bundled into the Copilot subscription. This is the central competitive fact.
