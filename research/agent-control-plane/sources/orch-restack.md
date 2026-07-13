# Restack (restack.io)

- **Accessed:** 2026-07-13
- **Type:** Primary (restack.io) + secondary directories
- **Confidence:** high (pricing, positioning), med (HITL/durable detail from directories)

## What it is
Hosted + self-hostable durable-execution platform for AI agents aimed at product/ops teams. "We provide the underlying infrastructure to build and orchestrate AI agents securely." Built on Python + Kubernetes. Temporal-like durable execution.

## Hosted run control plane: YES
- Managed Restack Cloud. "Deploy Restack securely in your own cloud (AWS, GCP, Azure) or on-premise. With real-time logs and complete audit trails." Product teams "design, test and optimize agents at Enterprise Scale."

## HITL: PARTIAL
- Escalation/handoff flows + built-in evaluation; formal signal/approval gates less explicitly documented than Temporal/Orkes.

## Durable state & provenance: YES
- "Long-running workflows (persisting state for months/years)," retry policies, task queues w/ concurrency control, cron scheduling, "complete audit trails."

## Multi-agent: YES — orchestrates multiple agents; open on MCP, APIs, React components.

## Buyer / deploy
- Buyer: "IT and operational leaders" / product teams with "full autonomy from engineering."
- Deploy: OSS/self-host on K8s; Restack Cloud (SaaS); BYOC (AWS/GCP/Azure); on-prem Enterprise.

## PRICING (restack.io/pricing)
- Restack Cloud: "$25 / user / month" + metered compute.
- BYOC: "$999 / month", up to 4 nodes @ 4 GiB each; "Pay your cloud provider directly. No markups."
- Enterprise: Custom.
- Compute/min: XS "$0.00185", S "$0.00389", M "$0.00816", L "$0.01715".

## Sources
- https://www.restack.io/pricing (high)
- https://www.restack.io/ (high)
- Secondary AI-agent directories (med)

## Relevance to Hermes
NEAR-DIRECT-to-adjacent. Ops-team-friendly durable-agent platform with audit trails and logs. Still infra/durable-execution-first; legibility = logs/audit rather than human-narrative run review.
