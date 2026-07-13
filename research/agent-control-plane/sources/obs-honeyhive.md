# HoneyHive (honeyhive.ai)

- URL (product): https://www.honeyhive.ai/observability
- URL (pricing): https://www.honeyhive.ai/pricing
- URL (annotation queues doc): https://docs.honeyhive.ai/evaluation/annotation-queues
- Accessed: 2026-07-13
- Confidence: high (items 1-3,5-7); med (item 4 durable state inferred)

## What it is
OpenTelemetry-native AI observability + evaluation platform for tracing, evaluating, monitoring LLM apps and agents.

## Agent-focused?
Yes, explicitly agent-first.
> "OTel-native AI observability, purpose-built for agents."
Agent DAG views ("Visualize complex agentic workflows as DAGs"), agentic failure detection ("tool misuse or looping"), multi-step trajectory eval, "Agent Development Lifecycle (ADLC)" framing.

## Human-in-the-loop?
Offline annotation/review + triage escalation — NOT live approval gates.
> "Annotation queues... organize and manage events that require human review, labeling, or quality assessment."
Post-hoc over the Log Store; escalates failing traces to domain experts. No synchronous approval that pauses a live agent mid-run.

## Durable run state / provenance?
Read-oriented. Captures/visualizes traces, curates datasets from failing traces. No authoritative, mutable run-state store to drive execution from. (Inferred.)

## Buyer / deploy
Buyer: AI/ML eng + domain experts/SMEs collaborating; enterprise (Commonwealth Bank). Deploy: SaaS-first, NOT OSS. Free tier multi-tenant SaaS only; Enterprise adds single-tenant/hybrid/self-hosted.

## Pricing (accessed 2026-07-13)
- Developer (Free): 10K events/mo, up to 5 users, 30-day retention, multi-tenant SaaS only.
- Enterprise: contact-sales (custom limits, SSO/SAML, HIPAA, SLA). No public number; no mid-tier self-serve paid plan.

## Anecdote (unverified)
Show HN (Oct 2023) launch. Funding: $7.4M total ($5.5M Seed Insight Partners + $1.9M Pre-Seed). Little independent Reddit/X sentiment surfaced.
