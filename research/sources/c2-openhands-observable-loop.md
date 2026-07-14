# OpenHands (ex-OpenDevin) — observable agent loop + planning mode

- Type: COMMUNITY reviews + OFFICIAL product framing
- Accessed: 2026-07-13
- URLs:
  - https://www.openhands.dev/ (official)
  - https://vibecoding.app/blog/openhands-review (review, 2026)
  - https://sider.ai/blog/ai-tools/ai-openhands-review-can-this-open-source-ai-developer-really-ship-code
  - https://pickuma.com/for-dev/openhands-review-open-source-autonomous-coding-agent-2026/
  - https://trilogyai.substack.com/p/the-autonomous-developer

## Legibility features (praised)
- OpenHands exposes a **transparent, observable agent loop**: chat panel beside
  a **live view of the agent's terminal and editor**; every action is logged so
  you can "review exactly what the agent did." Praised by users who want to
  study how agent actions/tools map to outcomes.
- Local web GUI (Docker) lets you **interrupt mid-run** and correct course —
  reviewers frame treating the agent as a pair (interruptible) vs a "vending
  machine" as roughly doubling completion rate on non-trivial tasks (anecdotal).

## Losing-track / off-rails signals
- "One of the biggest complaints about autonomous agents is that they sometimes
  charge off in the wrong direction and make a mess before you can intervene."
- **Planning Mode (beta)** added specifically to fix this: agent drafts a
  detailed plan and asks for approval before writing code.
- Reviewers note visible **backtrack loops**: agent narrates a plan, executes,
  then backtracks when a test fails — "watching that backtrack loop is the most
  honest benchmark you'll get." Open-ended specs cause "planning drift and looping."

## Relevance to Hermes Canvas
- The live terminal+editor+log combo is the canonical "make agent work legible"
  UX; validates Hermes direction. Interruptibility is a core trust lever.
- The failure mode is *pre-intervention mess*: users need to SEE drift early
  enough to stop it — argues for streaming, glanceable state over post-hoc logs.
- "Backtrack loop" honesty cuts both ways: transparency can mean *too much
  output* to follow; summarization/plan-diffing matters.
- Confidence: MEDIUM-HIGH (consistent across several independent 2026 reviews;
  completion-rate claim is anecdotal).
