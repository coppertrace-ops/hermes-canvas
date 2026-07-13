# Temporal — Durable Execution + Temporal for AI Agents

- URL: https://temporal.io/ , https://temporal.io/pricing , https://temporal.io/blog/announcing-openai-agents-sdk-integration
- Accessed: 2026-07-13
- Confidence: High (official pricing + official blog)

## What it is / run dashboard
Durable execution platform. Persists every step of a workflow as an event in **Event History**; on crash "Temporal replays that history on a new worker and resumes from exactly where it left off." Workflow replay "does not re-execute activities—it only re-runs the workflow's coordination code using the recorded outputs from the event history." Local dev server ships "a web UI for inspecting workflow execution histories."

## Provenance vs agent self-report
For agents: on replay "the Workflow does not ask the agent for a new plan for decisions it has already made. The agent instead uses Temporal's Event History as a record of past decisions." Server-held event history is the source of truth, not the agent's narration.

## Agent-specific
OpenAI Agents SDK + Temporal integration "Generally Available" as of March 23, 2026. "An agent running as a Temporal Workflow persists its state automatically, resumes from exactly where it left off after a crash." Named production users: OpenAI (Codex), Replit, Lovable. Feb 2026: $300M Series D at $5B valuation (a16z).

## Pricing (verbatim, accessed 2026-07-13)
- Essentials: "Starting at $100/mo." — includes "1 M Actions"
- Business: "Starting at $500/mo." — includes "2.5 M Actions"
- Enterprise: "Contact Sales" — includes "10 M Actions"
- Per-Action beyond included: "Next 5M $50 / Next 5M $45 / Next 10M $40 ..." (per million)

## Deploy
Temporal Cloud (managed) or self-host OSS server. Buyer: platform/infra engineers.
