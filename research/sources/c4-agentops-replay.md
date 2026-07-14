# C4 — AgentOps session replay / time-travel

**Accessed:** 2026-07-13
**Type:** official (agentops.ai, docs) + community guides

## Sources
- https://www.agentops.ai/ (official)
- https://docs.agentops.ai/ (official)
- https://github.com/agentops-ai/agentops (official repo)
- https://qaskills.sh/blog/agentops-agent-monitoring-guide-2026 (community guide)
- https://machinelearningmastery.com/the-practitioners-guide-to-agentops/ (community)

## Notes
AgentOps records an **entire session** — every LLM call, tool invocation, and step, start to finish — and lets you **replay it visually**. Signature feature = **session replay**: one complete agent run reconstructed as a visual, step-by-step **timeline** you walk through: read the full prompt/completion at each step, see each tool's args and results, inspect per-step latency and cost.

**Time-travel debugging:** rewind to any step, inspect exact state at that moment, walk forward through consequences ("point-in-time precision"). Events are **color-coded** (LLM calls green, tool usage yellow, errors red). A graph view shows multi-agent interactions/structure at a glance. Setup: "two lines of code."

## Relevance to Hermes / Fable claim #3
AgentOps is the closest trace-tool to Hermes' "replay/audit" pitch — it reconstructs *state at each step*. Notable: even a replay tool foregrounds **steps/events**, not the evolving artifact. The "time-travel to inspect state" idea maps directly to versioned-artifact diffing, BUT AgentOps' state is the *agent's execution state* (prompts, tool results), whereas a canvas version is the *human-facing output state*. This is the crux of the trace-vs-artifact distinction: replay ≈ "watch it get built"; versioned artifact ≈ "read what it became." Confidence: high (official on features).
