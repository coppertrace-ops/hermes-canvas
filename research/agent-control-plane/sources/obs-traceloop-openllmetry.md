# Traceloop / OpenLLMetry

- URL (product): https://www.traceloop.com/
- URL (pricing): https://www.traceloop.com/pricing
- URL (annotations doc): https://www.traceloop.com/docs/openllmetry/tracing/annotations
- URL (repo): https://github.com/traceloop/openllmetry
- Accessed: 2026-07-13
- Confidence: high (identity/OSS/free tier); med (HITL absence, enterprise price)

## What it is
LLM reliability/observability platform (YC W23) built on OpenLLMetry, its Apache-2.0 OSS SDK extending OpenTelemetry with LLM/GenAI semantic conventions.
> "OpenLLMetry is a set of extensions built on top of OpenTelemetry that gives you complete observability over your LLM application."

## Agent-focused?
Partial. Instruments agent frameworks (CrewAI, LangGraph, OpenAI Agents, AWS Strands, Haystack, LlamaIndex) with @workflow/@task/@agent/@tool decorators, but surface centers on traces/metrics/cost/RAG-quality/eval monitors — no dedicated agent-run dashboards.

## Human-in-the-loop?
None found. Traceloop "annotations" are code decorators for instrumenting your app, NOT human review queues.
> "Traceloop SDK supports several ways to annotate workflows, tasks, agents and tools in your code..."
Eval Dashboard + automated monitors only; no approvals/queues/live review.

## Durable run state / provenance?
Read-only traces exported to Traceloop or third-party stacks (Datadog, New Relic, Sentry, Honeycomb). No persisted actable run state.

## Buyer / deploy
Buyer: AI/ML + platform/infra eng standardized on OpenTelemetry. Deploy: hybrid — OSS SDK (Apache-2.0; Python/TS/Go/Ruby) + SaaS + self-host/on-prem/air-gapped (Enterprise).

## Pricing (accessed 2026-07-13)
- Free Forever: $0, up to 50K spans/mo, up to 5 seats, 24-hour retention.
- Enterprise: contact-sales (>50K spans, unlimited seats, custom retention, SOC 2, on-prem). No published number.

## Anecdote (unverified)
HN: OTel-standardization/no lock-in praised; "Sentry for LLM apps." Criticism: hallucination-detection marketing pushback; 24h free-tier retention weak.
