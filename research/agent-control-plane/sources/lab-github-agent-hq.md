# GitHub Agent HQ + mission control (cross-vendor coding-agent control plane)

**Accessed:** 2026-07-13
**Confidence:** high (github.blog + docs)

## Sources
- "Introducing Agent HQ: Any agent, any way you work" (Oct 28, 2025, GitHub Universe) — https://github.blog/news-insights/company-news/welcome-home-agents/
- "A mission control to assign, steer, and track Copilot coding agent tasks" (changelog, Oct 28, 2025) — https://github.blog/changelog/2025-10-28-a-mission-control-to-assign-steer-and-track-copilot-coding-agent-tasks/
- "Pick your agent: Use Claude and Codex on Agent HQ" — https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/
- Tracking Copilot's sessions (docs) — https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/track-copilot-sessions
- "Trace any commit to its session logs" (changelog, Mar 20, 2026) — https://github.blog/changelog/2026-03-20-trace-any-copilot-coding-agent-commit-to-its-session-logs/

## CRITICAL: cross-VENDOR coding-agent control plane (the biggest bundling signal)
- "Agent HQ transforms GitHub into an open ecosystem that unites every agent on a single platform."
- "Coding agents from Anthropic, OpenAI, Google, Cognition, and xAI will be available on GitHub as part of your paid GitHub Copilot subscription."
- Mission control: "a consistent interface across GitHub, VS Code, mobile, and the CLI that lets you direct, monitor, and manage every AI-driven task." "choose from a fleet of agents, assign them work in parallel, and track their progress from any device."
- HITL: "With real-time steering, you can guide Copilot as it's working. Provide input while a session runs, and Copilot will adapt as soon as its current tool call completes."
- "Copilot Pro+ and Copilot Enterprise users can now run multiple coding agents directly inside GitHub." (Claude/Codex shipping; Google/Cognition/xAI "coming months.")

## Provenance / session logs
- "In the session logs, you can see Copilot's internal monologue and the tools it used."
- "Each commit message includes a link to the session logs for that commit, so you can... trace it later for auditing purposes."

## Assessment
- **Native run dashboard/traces/HITL?** Yes — mission control = fleet assignment + real-time steering (HITL) + session logs + commit-to-log provenance.
- **Model-locked?** NO — explicitly hosts third-party agents (Anthropic/OpenAI/Google/Cognition/xAI). This is the single strongest evidence a lab-adjacent player is building the cross-vendor control plane. BUT it orchestrates agents' GitHub-side runs (PRs/sessions); it is NOT described as ingesting each vendor's internal cross-vendor traces.
- **Dev vs operator?** Developers orchestrating coding agents. Scope = coding/SWE, GitHub-centric.
- **Pricing:** bundled into paid Copilot (Pro+/Enterprise first); Copilot moved to usage-based billing / AI Credits Jun 1, 2026.
