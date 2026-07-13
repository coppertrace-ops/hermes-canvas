# Source: Terragon/Terry + Async (cloud/hosted background runners)

**Accessed:** 2026-07-13

## PRIMARY — Terragon Labs / Terry

**https://github.com/terragon-labs/terragon-oss** (confidence: high)
- "It was a remote background agent orchestrator for running Claude Code, Codex, and other coding clis in the cloud."
- "Delegate work to coding agents in the cloud." Agents: Claude Code, Codex, Amp, Gemini — "each running in isolated sandbox containers."
- "unique branches, and agent work is checkpointed and pushed to GitHub with AI-generated commits and Pull Requests."
- `terry` CLI: "local task takeover and continuation."
- "includes a dashboard for real-time task monitoring." Stack: TS, PostgreSQL, Redis, **Stripe** (was paid/hosted SaaS).
- Status: "an open-source snapshot of Terragon at the time of shutdown … no guarantees of maintenance." License: Apache-2.0. (SHUT DOWN ~Jan 2026.)

## PRIMARY — Async (bkdevs)

**https://github.com/bkdevs/async-server** (confidence: med)
- Repo strapline: "It's like Claude Code + Linear + GitHub PR."
- Show HN (news.ycombinator.com/item?id=45013572): "Async – Claude code and Linear and GitHub PRs in one opinionated tool."
- Made by "bkdevs." Flow: researches task by analyzing codebase + asks clarifying questions → executes in isolated CLOUD environments → breaks work into reviewable subtasks with stack diffs → GitHub issue to merged PR. (confidence: med, part search-secondary)

## ANECDOTE

- ymichael.com "Claude Code Unleashed" and search summaries describe Terragon: "give it a task and it works on it and creates a PR." (confidence: med)
- Devin (Cognition), Google Jules, OpenAI Codex cloud = adjacent hosted async PR-bots (frontier/well-funded), same "fire task → get PR" model. (confidence: med)

## READ

- These are HOSTED / cloud-compute (not BYO-compute), often paid (Terragon had Stripe). Provenance = branch + AI commits + PR + real-time task dashboard. Human control = async review of PR + local "takeover." Legibility = PR/diff-centric, less live-terminal (async, cloud). Buyer = devs wanting fire-and-forget delegation. Both Terragon and Async are cloud outliers vs the local worktree cluster; Terragon shut down.
