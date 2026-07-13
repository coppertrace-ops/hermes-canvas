# Google — Vertex AI Agent Engine (Gemini Enterprise Agent Platform)

- **Accessed:** 2026-07-13
- **Type:** Primary pricing pages (cloud.google.com) + secondary detail
- **Confidence:** high (runtime pricing), med (Sessions/Memory Bank numbers via secondary)

## What it is
Managed runtime for deploying/operating agents on Vertex AI, now folded into "Gemini Enterprise Agent Platform." Includes Agent Engine runtime, Sessions (conversation state), Memory Bank, Example Store, and governance (Semantic Governance, Agent Gateway).

## Hosted run control plane: YES (cloud-native)
- Managed deploy + scaling of agents; integrated tracing/observability; Sessions manage conversation history/state.

## HITL / approval gates
- Semantic Governance Policy (response evaluations); not a headline human-approval inbox. HITL via app logic.

## Durable state & provenance: YES
- Sessions ("manages conversation history and state"); Memory Bank ("managed service for agent memory generation, storage, retrieval and embedding").

## Multi-agent: YES (ADK + Agent Engine; A2A via Agent Gateway).

## Buyer / deploy
- Buyer: Google Cloud enterprise / developers.
- Deploy: cloud-native managed (GCP only).

## PRICING (cloud.google.com/vertex-ai/pricing — Gemini Enterprise Agent Platform)
- Agent Engine runtime: "$0.0864 per vCPU-hour" and "$0.0090 per GB-hour"; free tier 50 vCPU-hours + 100 GB-hours/mo.
- Sessions & Memory Bank (billing began 2026-09-01): storage "$0.30/GiB-month"; reads "1 Agent Compute vCPU-h ($0.085) for every 3 million read operations."
- Agent Gateway (Agent-to-Anywhere) billing effective 2026-07-13.

## Sources
- https://cloud.google.com/vertex-ai/pricing (high for runtime; med for Sessions/Memory Bank exact numbers)
- Secondary: nerova.ai / cloudzero Vertex pricing guides (med)

## Relevance to Hermes
ADJACENT (hyperscaler bundling). Managed run substrate + memory + governance, GCP-locked, devops/enterprise-first. Not a human-first legibility surface. Category-bundling risk.
