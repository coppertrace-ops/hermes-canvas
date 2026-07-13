# Agent state / memory stores — Letta (MemGPT), Zep, mem0

- URLs: https://www.letta.com/ , https://docs.letta.com/ , https://www.getzep.com/ , https://mem0.ai/
- Accessed: 2026-07-13
- Confidence: Medium-High (official sites + 2026 comparison sources)

## Letta (formerly MemGPT)
"Platform for stateful agents." Agent state "persisted in databases rather than Python variables"; memory edits "durable ... persistence-by-default." Agent Development Environment (ADE) for "visual debugging, monitoring, and inspecting memory state." "tracing features that log every LLM call, tool call, and memory edit." Pricing: Apache-2.0 self-host; Letta Cloud free tier "5,000 monthly credits."

## Zep
"Agent memory at enterprise scale" on Graphiti temporal knowledge graph; "Every edge ... carries explicit temporal metadata: valid_from, valid_to, and invalid_at." Pricing (2026): Free "$0" (10K messages); Flex "$25/month"; Pro "$99/mo+" (500K messages); Enterprise (SOC2/HIPAA, SSO+RBAC+Auditing).

## mem0
Memory layer. Free tier "10K memories and 1K retrieval calls/month"; "$19/mo for 50K memories," "$249/mo for Pro."

## STATE/observability angle (vs Hermes)
These persist agent MEMORY (facts/context) and give some tracing, but they are memory-quality/retrieval products — NOT durable RUN state machines with server-verified event history, replay, or delivery receipts. Zep's temporal graph (bitemporal, audit-friendly) is the closest to provenance. Buyer: AI/agent developers.
