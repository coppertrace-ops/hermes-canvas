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
