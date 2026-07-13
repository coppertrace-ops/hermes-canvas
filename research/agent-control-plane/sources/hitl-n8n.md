# Source: n8n — human-in-the-loop for AI tool calls

- **URLs:**
  - https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/
  - https://docs.n8n.io/build/integrate-ai/ai-examples/human-in-the-loop-for-tools
  - https://blog.n8n.io/human-in-the-loop-automation/
- **Accessed:** 2026-07-13
- **Type:** PRIMARY (vendor docs/blog)
- **Confidence:** high

## What it is
Workflow-automation platform (dev-leaning, fair-code/self-hostable). HITL is built into the AI Agent node: a "gated" tool pauses execution and requests human approval before the tool runs. Approval routed via Slack, Gmail, Teams, Telegram, Discord, WhatsApp, or built-in Chat node.

## Verbatim (per docs, via search)
- "When you mark a tool as 'gated'... the moment it tries to call that gated tool, execution stops. A notification goes out... and the workflow waits until a person explicitly clicks Approve or Reject."
- "The gate is enforced at the tool level, not the workflow level."
- "The AI can dynamically specify tool parameters, and those AI-determined values are what the human reviewer sees and approves." (evidence/provenance for reviewer)

## HITL model
Blocking **tool-level approval gate** (Approve/Deny). Reviewer sees the concrete tool params. Wait-node pattern; state held by n8n execution.

## Buyer / persona / deploy / price
Technical automation builder / ops-eng (prosumer→SMB→enterprise). Self-host (free OSS) or n8n Cloud. Pricing execution-based (varies; not captured verbatim here).
