# Windsurf / Cascade — staged reviewable diffs, per-step approval, checkpoints

- Type: COMMUNITY reviews + safety analysis (some vendor-adjacent)
- Accessed: 2026-07-13
- URLs:
  - https://www.digitalapplied.com/blog/windsurf-2-deep-dive-cascade-agents-flows-2026
  - https://vibe-eval.com/safety/windsurf/ (safety audit, 2026)
  - https://emergent.sh/learn/windsurf-review
  - https://markaicode.com/windsurf-cascade-agent-autonomous-refactoring/

## Legibility / review model (praised)
- Cascade is an agentic pane that (a) edits multiple files per run, (b) calls
  tools (MCP, shell, web), and (c) **stages edits as a reviewable diff with
  per-step approval before anything lands on disk**.
- Reviewers frame per-step approval as "the difference between an agent that
  can be trusted on production code and a chat assistant that occasionally
  gets it right."
- **Checkpoints**: each stage is a checkpoint to review/test/course-correct;
  users can revert to a previous conversation step (undo edits after that
  point) and create named snapshots to return to.

## Caveats / complaints
- Safety audit clarifies **per-step approval is configurable but defaults
  vary by mode** — safety "depends entirely on deliberate lockdown." Cascade
  does NOT default to checkpoints that pause execution.
- Risk of **unreviewed actions**: "A single prompt like 'fix the build' can
  result in a .env rewrite, a package.json change, an npm install of a
  malicious lookalike, and a commit — all before you read the plan." Prompt
  injection from docs can drive actions without a human stop.
- **Context drift** = most common regression source: great in hour 1, but by
  hour 3 Cascade works from a "compressed understanding" that drops earlier
  constraints. (COMMUNITY, multiple reviewers.)
- March 2026 pricing change burned trust for quota-hitting users.

## Relevance to Hermes Canvas
- Confirms "stage-as-diff + per-step approval + checkpoints" as the trusted
  pattern — but the key insight is DEFAULTS: safety-by-configuration fails;
  legibility must be the default, not an opt-in mode.
- Context drift is a legibility problem too: users can't tell the agent has
  silently lost constraints. A canvas that surfaces the agent's current
  working assumptions/constraints would address this directly.
- Confidence: MEDIUM-HIGH (consistent across reviews; some sources vendor-adjacent).
