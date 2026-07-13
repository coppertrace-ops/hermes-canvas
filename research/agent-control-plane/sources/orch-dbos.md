# DBOS (DBOS Transact / DBOS Conductor / DBOS Cloud)

- **Accessed:** 2026-07-13
- **Type:** Primary (dbos.dev)
- **Confidence:** high

## What it is
Ultra-lightweight OSS durable-execution library (Python/TS/Java) — "database-backed durable workflows" with once-and-only-once execution. DBOS Conductor = workflow-ops console; DBOS Cloud = serverless hosting.

## Hosted run control plane: YES (via Conductor)
- "Monitor, version, fork, replay, and observe durable workflows with DBOS Conductor console." "gives you visibility into DBOS workflow and queueing state and history. It can alert you to failures, and allow you to stop, start, fork, pause workflows."
- Time-travel debugging: "view application execution at any point in time, stepping through state changes as they actually happened" (DBOS Cloud).

## HITL / approval gates
- Not a headline feature; durable workflows can await external input (build-your-own approval step).

## Durable state & provenance: YES (core)
- Checkpointed workflows/steps/transactions in Postgres; replay/fork; full history.

## Multi-agent
- Not agent-opinionated; durable-execution substrate for agents (like Temporal, lighter-weight, DB-native).

## Buyer / deploy
- Buyer: developers wanting durability without a separate orchestration server.
- Deploy: OSS library ("free forever") + Conductor SaaS + DBOS Cloud + self-host Conductor (Enterprise).

## PRICING (dbos.dev/dbos-pricing)
- Transact (OSS): free forever.
- Pro: "$99/month" — 2 seats, 3 apps, 1M checkpoints/mo, extra "$50 per million"; includes Conductor console.
- Teams: "$499/month" — 10 seats, 10 apps, 10M free checkpoints, extra "$40 per million"; RBAC, SOC2/HIPAA.
- Enterprise: Custom — SSO/SAML, self-host Conductor.
- DBOS Cloud: contact sales.

## Sources
- https://www.dbos.dev/dbos-pricing (high)
- https://www.dbos.dev/dbos-transact (high)
- https://www.dbos.dev/ (high)

## Relevance to Hermes
ADJACENT. Durable-execution + ops console with fork/replay/time-travel — provenance-strong but developer/devops-first, DB-centric. Substrate, not human-first legibility surface. Interesting pricing anchor (checkpoint-metered).
