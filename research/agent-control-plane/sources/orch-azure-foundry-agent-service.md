# Microsoft — Azure AI Foundry Agent Service (Microsoft Foundry Agent Service)

- **Accessed:** 2026-07-13
- **Type:** Primary (azure.microsoft.com, learn.microsoft.com) + secondary detail
- **Confidence:** high (existence/GA, HITL pattern), med (pricing specifics via secondary)

## What it is
Managed, cloud-native agent service on Azure AI Foundry (GA ~2026-03). Hosts/runs agents built with Microsoft Agent Framework (successor to AutoGen + Semantic Kernel). GA framing: "production-grade infrastructure for agentic DevOps."

## Hosted run control plane: YES (cloud-native)
- Managed agent hosting; sessions (replaced "threads"); integrated tracing/observability in Foundry portal; connected/multi-agent orchestration.

## HITL / approval gates: YES (documented pattern)
- "Durable Agent Orchestration uses Azure Durable Functions to handle long-running tasks where agents wait for human approval via SignalR." "agents that survive restarts and wait days for human approval."

## Durable state & provenance: YES
- Durable Functions backing; sessions manage state; agents "survive restarts."

## Multi-agent: YES (connected agents, Agent Framework orchestration).

## Buyer / deploy
- Buyer: Azure enterprise / developers.
- Deploy: cloud-native managed (Azure). Pay-as-you-go tokens or PTU reserved capacity.

## PRICING (azure.microsoft.com/pricing/details/foundry-agent-service)
- Pay-as-you-go per token consumed (model SKU rates), no upfront commitment.
- Provisioned Throughput Units (PTUs): reserved capacity at fixed hourly rate; secondary sources cite "starting at approximately $2,448 per month" (secondary, med confidence).
- Exact per-agent/run figures: see official page; token + PTU model.

## Sources
- https://azure.microsoft.com/en-us/pricing/details/foundry-agent-service/ (high)
- https://learn.microsoft.com/en-us/azure/foundry/agents/overview (high)
- https://devblogs.microsoft.com/foundry/agent-service-build2026/ (high, HITL/durable pattern)
- Secondary: wrvishnu.com Azure Foundry pricing 2026 (med, PTU $ figure)

## Relevance to Hermes
ADJACENT (hyperscaler bundling). Notably has an explicit durable HITL "wait days for human approval" pattern — closest hyperscaler to Hermes on approval-gate concept. Still Azure-locked, devops-first, no human-narrative legibility workspace. Bundling risk + validation that "durable HITL approval" is a recognized need.
