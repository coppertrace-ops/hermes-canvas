# Microsoft Agent Framework / AutoGen / AG2

- **Accessed:** 2026-07-13
- **Type:** Primary (learn.microsoft.com, devblogs.microsoft.com, ag2.ai, github.com/ag2ai/ag2)
- **Confidence:** high

## What it is
- **Microsoft Agent Framework** — open-source SDK + runtime unifying Semantic Kernel + AutoGen; GA v1.0 April 2026 (.NET + Python). "build, orchestrate, and govern multi-agent AI systems."
- **AutoGen** — original MS research multi-agent framework; superseded by Agent Framework (migration guide exists).
- **AG2** (formerly AutoGen, community fork) — "open-source AgentOS": conversable agents, group chats, swarms, tools, human review, RAG, code execution.

## Hosted run control plane: NO (framework/SDK, not a hosted plane)
- Agent Framework is an SDK/runtime you self-host; the *hosted* plane is Azure AI Foundry Agent Service (see orch-azure-foundry-agent-service.md). No standalone hosted run dashboard from the framework itself.

## HITL / approval gates: YES (framework-level)
- "All orchestration patterns support streaming, checkpointing, human-in-the-loop approvals, and pause/resume for long-running workflows." AG2 includes "human review."

## Durable state & provenance: YES (framework-level)
- Checkpointing; pause/resume; observable events. Durability productized when paired with Azure Durable Functions in Foundry.

## Multi-agent: YES (core — orchestration patterns, group chats, swarms, connected agents).

## Buyer / deploy
- Buyer: .NET/Python developers; Microsoft enterprise shops.
- Deploy: OSS SDK (self-host anywhere) → hosted via Azure AI Foundry.

## PRICING
- Framework/AG2: free/OSS. Hosted runtime = Azure Foundry Agent Service pricing (token + PTU).

## Sources
- https://devblogs.microsoft.com/foundry/introducing-microsoft-agent-framework-the-open-source-engine-for-agentic-ai-apps/ (high)
- https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/ (high)
- https://www.ag2.ai/ , https://github.com/ag2ai/ag2 (high)

## Relevance to Hermes
ADJACENT. A framework/SDK layer, not a hosted human-first control plane. Confirms HITL approvals + checkpointing are table-stakes primitives, but the legible hosted surface is left to Foundry (devops-first) — whitespace remains for human-first legibility.
