# LlamaIndex / LlamaCloud / llama_deploy (AgentWorkflow)

- **Accessed:** 2026-07-13
- **Type:** Primary (llamaindex.ai, developers.llamaindex.ai) + secondary GitHub
- **Confidence:** high (framework, pricing), med (llama_deploy control-plane detail)

## What it is
- LlamaIndex framework — OSS. `AgentWorkflow` = event-driven, step-based multi-agent orchestration.
- llama_deploy (formerly llama-agents) — OSS deployment layer; runs Workflows as distributed microservices with a control plane + message queues (Redis/Kafka/RabbitMQ/SQS). Self-hosted.
- LlamaCloud — hosted SaaS, positioned as a **document automation platform** (Parse/Extract/Index), NOT an agent run control plane.

## Hosted run control plane: WEAK / split
- llama_deploy's "control plane" concept is real but self-hosted. LlamaCloud (managed) is doc pipelines, not live agent-run dashboards. No strong hosted attach/resume/inspect UI like Temporal/Orkes.

## HITL: framework-level
- "At any point, the current active agent can choose to return control back to the user." Not a hosted approval-gate product.

## Durable state & provenance: PARTIAL
- AgentWorkflow "maintains shared state across agents." Durability depends on chosen message-queue backend; not event-sourced replay.

## Multi-agent: STRONG
- "Allow the agent to 'handoff' control to another agent when it decides. Repeat until an agent returns a final answer."

## Buyer / deploy
- Buyer: app developers / AI engineers; LlamaCloud targets document-heavy RAG teams.
- Deploy: OSS framework + self-hosted llama_deploy; LlamaCloud SaaS/Hybrid (Enterprise).

## PRICING (llamaindex.ai/pricing — LlamaParse credit-based)
- Free: $0/mo, 10K credits. Starter: "$50 /month", 40K credits (PAYG to 400K). Pro: "$500 /month", 400K credits. Enterprise: Custom. "1,000 credits = $1.25".
- Note: pricing is for document parsing, not agent-run execution.

## Sources
- https://www.llamaindex.ai/pricing (high)
- https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/ (high)
- https://www.llamaindex.ai/llamacloud (high) — "Your document automation platform for unstructured data"
- https://github.com/run-llama/llama_deploy (med)

## Relevance to Hermes
ADJACENT. Best multi-agent handoff framework, but hosted product is a doc-automation SaaS, and its control plane is OSS/self-host. Not a human-first agent-run legibility surface.
