# Source: HumanLayer (HITL API + Agent Control Plane + CodeLayer)

- **URLs:**
  - https://www.humanlayer.dev/ (product)
  - https://www.humanlayer.dev/pricing (pricing)
  - https://github.com/humanlayer/agentcontrolplane (ACP OSS)
- **Accessed:** 2026-07-13
- **Type:** PRIMARY (vendor site + vendor GitHub)
- **Confidence:** high (pricing/product), med (positioning shift is recent)

## What it is
Started as an API/SDK to add human-in-the-loop **approvals, feedback, and human contact** to AI agents at the *tool-calling layer* (BYO LLM + framework: LangChain, CrewAI, Vercel AI SDK, Mastra, etc.), via Slack/email. By mid-2026 the top-level positioning has **pivoted to an AI coding IDE / "software factory"** ("an AI IDE, collaboration platform, and building blocks for your software factory," pricing page). CodeLayer = open-source desktop app orchestrating parallel Claude Code sessions with HITL approval + context engineering.

## Verbatim
- ACP: "ACP (Agent Control Plane) is a cloud-native orchestrator for AI Agents built on Kubernetes." (GitHub)
- ACP: "designed for [long-lived outer-loop agents] that can process asynchronous execution of both LLM inference and long-running tool calls."
- ACP: "for agents that make asynchronous tool calls like contacting humans or delegating work to other agents." + "Full MCP support."
- Pricing page — Pro "$100/user/mo," "BYOK for Claude Code, Codex, and more," "Real-Time Human+Agent Collaboration on Artifacts."

## HITL model
Blocking **approval gates on tool calls** (approve/deny, routing, escalations, timeouts, learning/auto-approve). Async delivery over Slack/email.

## Buyer / persona / deploy / price
Developer / AI engineering team. SDK + cloud + K8s (ACP) + desktop (CodeLayer). Free Starter (3 members, 200 sessions/mo); **Pro $100/user/mo**; Enterprise custom (SSO/SAML, audit logs, on-prem/VPC).
