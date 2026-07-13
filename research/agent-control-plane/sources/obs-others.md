# Others in segment: Galileo, AgentOps, Maxim AI, Langtrace

- Accessed: 2026-07-13
- Confidence: high (each below), except where noted

## Galileo (galileo.ai)
- URL: https://galileo.ai/ , https://galileo.ai/pricing
- "Agent Reliability Platform." Agent-central.
  > "Observe, evaluate, guardrail, and improve agent behavior in minutes."
  > "Framework-agnostic Graph Engine that renders every branch, decision, and tool call."
- HITL: offline — Annotations, Annotation Queues (Enterprise beta SME review), CLHF (tunes LLM-judge from ~5 records). Live enforcement is AUTOMATED guardrails (Luna models), no human in loop.
- Run state: read-only traces + automated guardrails; no durable/resumable state.
- Deploy: SaaS + hybrid self-host (VPC/on-prem/air-gapped K8s, AWS Marketplace). Proprietary.
- Pricing: Free $0 (5K traces/mo, unlimited users); Pro $100/mo yearly (+50K traces/mo); Enterprise contact-sales. Raised ~$68M incl. $45M Series B.

## AgentOps (agentops.ai)
- URL: https://www.agentops.ai/ , GitHub AgentOps-AI/agentops
- "Observability and DevTool platform for AI Agents." Agent-explicit, replay-led.
  > "Time Travel Debugging: Rewind and replay agent runs with point in time precision"
- HITL: none on official evidence (passive observability + replay). A third-party blog claims a HITL approval module — UNCONFIRMED.
- Run state: read-only telemetry/replay. No durable run-state store.
- Deploy: SaaS + MIT-licensed OSS SDK + enterprise self-host. 400+ LLMs/frameworks.
- Pricing: Basic $0 (up to 5K events); Pro from $40/mo PAYG (unlimited events/retention, RBAC); Enterprise custom.

## Maxim AI (getmaxim.ai)
- URL: https://www.getmaxim.ai/ , https://www.getmaxim.ai/pricing
- "End-to-end evaluation and observability platform... ship AI agents reliably and >5x faster." Agent-heavy (simulation + distributed tracing + multi-turn sessions).
- HITL: standout human-review layer but review/annotation-flavored, not runtime gates.
  > "queues for human labeling using either automated logic or based on manual filters."
  Spans offline eval AND production log review; Enterprise offers managed human evals. No "approve before the agent acts" runtime gate.
- Run state: rich structured trace + eval store (sessions/traces/steps, versioned prompts, datasets, alerting) — more than read-only, but not an orchestration control plane.
- Persona: cross-functional eng + product ("PMs can define, run, and analyze evals independently"). Deploy: SaaS, closed-source.
- Pricing: Developer free (3 seats, 10K logs/mo, 3-day); Professional $29/seat/mo (100K logs, 7-day); Business $49/seat/mo (500K logs, 30-day); Enterprise custom.

## Langtrace (langtrace.ai) — OSS contrast
- URL: https://langtrace.ai/ , GitHub Scale3-Labs/langtrace
- "Open-source, Open Telemetry based end-to-end observability tool for LLM applications." Agent-framework tracing (CrewAI, LangGraph, DSPy), not simulation/dashboards.
- HITL: none advertised (automated/LLM/programmatic evals only).
- Run state: read-only trace store (NextJS + Postgres + ClickHouse) + prompt versioning.
- Deploy: OSS + self-host + SaaS. App AGPL-3.0, SDKs Apache-2.0.
- Pricing (docs-derived, re-verify live): Starter free (10K spans/mo, 1 user); Growth $39/user/mo + $0.005/extra span; Scale/Enterprise custom; self-host free.
