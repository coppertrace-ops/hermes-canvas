# AWS — Amazon Bedrock AgentCore

- **Accessed:** 2026-07-13
- **Type:** Primary (aws.amazon.com/bedrock/agentcore) + secondary cost blogs
- **Confidence:** high (runtime pricing, GA), med (12-component detail)

## What it is
Managed, cloud-native agent runtime + supporting services (Runtime, Memory, Gateway, Identity, Observability, plus a managed "Harness"). Consumption-based. Framework-agnostic (Strands, LangGraph, CrewAI, etc.).

## Hosted run control plane: YES (cloud-native)
- Managed AgentCore Harness now GA: "You can define an agent with CreateHarness and run it with InvokeHarness, with no orchestration code and no container to build." Adds built-in memory, versioning and endpoints, unified observability.
- AgentCore Observability: "complete visibility into agent workflows to trace, debug, and monitor agents' performance in production." Telemetry ingested into your CloudWatch.

## HITL / approval gates
- Not a headline productized feature; achievable via app logic. Governance/identity/policy emphasis (Gateway: "unified authentication, policy enforcement").

## Durable state & provenance: YES
- AgentCore Memory (built-in by default or BYO); observability traces; sessions.

## Multi-agent: YES (framework-agnostic; A2A + MCP via Gateway passthrough).

## Buyer / deploy
- Buyer: AWS enterprise / developers on Bedrock.
- Deploy: cloud-native managed (AWS only).

## PRICING (aws.amazon.com/bedrock/agentcore/pricing)
- "consumption-based pricing with no upfront commitments or minimum fees." "12 independent components across 5 billing patterns."
- Runtime: "$0.0895 per vCPU-hour" and "$0.00945 per GB-hour" (active CPU + peak memory). "I/O wait is free."
- Observability: pay-as-you-go for telemetry ingested/stored/queried (into your CloudWatch).

## Sources
- https://aws.amazon.com/bedrock/agentcore/pricing/ (high)
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html (high)
- Secondary: cloudburn.io AgentCore pricing breakdown (med)

## Relevance to Hermes
ADJACENT (cloud-platform play). Provides run substrate + observability + memory, but AWS-locked, devops-first, no human-first legibility/approval workspace. A hyperscaler bundling risk to note, not a UX competitor.
