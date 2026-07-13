# Post-MVP Backlog

## Headless Claude Code / Agent Run primitive

Hermes Canvas needs a first-class artifact type for driving and observing a headless coding agent such as Claude Code. This is separate from generic sandboxed static HTML.

### Desired capability

- Start, attach to, resume, stop, and inspect an explicitly authorized headless agent run.
- Live state: queued, starting, reasoning/tool-running, waiting, succeeded, failed, cancelled.
- Stream structured terminal/tool events and bounded log tails into a dedicated canvas panel.
- Show run provenance: model, task prompt/reference, workspace/worktree, branch, commit(s), changed files, tests/builds, deployment links, and timestamps.
- Surface agent turn/tool usage and meaningful progress checkpoints; avoid pretending raw chain-of-thought is available.
- Provide safe human controls: stop, retry, resume, open diff, inspect logs, approve/reject proposed action when appropriate.
- Link agent-produced artifacts, files, and commits back to the associated canvas tab/history.

### Design rule

The run panel must make autonomous work legible without becoming an unreadable terminal dump. It should answer: **what is the agent doing, what changed, what evidence proves it, and what needs human input?**

### Constraints

- Post-MVP; do not delay Wave 1 or Wave 2.
- Use a validated, event-based run protocol; no scraping terminal text as the source of truth when structured events exist.
- Preserve the existing append-only event/provenance model and closed-owner auth boundary.

## Product direction: agent observability meets a durable workspace

The post-MVP product thesis is not a generic AI canvas. It is a **human-readable operational workspace for an agent**: observability, controls, artifacts, plans, jobs, and evidence in the same place.

Build Hermes-first around the capabilities Frank actually uses, then generalize through an adapter protocol for compatible agents such as OpenClaw:

1. direct chat and attachments;
2. canvas artifacts, versions, and semantic diffs;
3. headless Claude Code / coding-agent runs;
4. cron jobs, scheduled research, and delivery receipts;
5. tool calls, files, deployments, and provider/account actions;
6. eventually multi-agent runs, approval gates, and integrations.

Every integration should emit normalized events, artifacts, run state, provenance, and actionable controls. The user-facing question remains: **what is the agent doing, what changed, what evidence proves it, and what needs human input?**
