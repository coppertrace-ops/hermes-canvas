# Datadog LLM Observability (branded "Agent Observability")

- URL (product): https://www.datadoghq.com/products/ai/agent-observability/
- URL (docs): https://docs.datadoghq.com/llm_observability/
- URL (annotation queues): https://docs.datadoghq.com/llm_observability/evaluations/annotation_queues/
- URL (pricing): https://www.datadoghq.com/pricing/list/
- Accessed: 2026-07-13
- Confidence: high (pricing); low (third-party per-request figures)

## What it is
SaaS platform for "monitoring, troubleshooting, and improving LLM applications and AI agents." Page now leads with "Agent Observability"; URLs/SKUs still say llm_observability.
> "Evaluate, improve, and trace your AI agents with offline experimentation and production observability in one platform."

## Agent-focused?
Yes, headline positioning.
> "Ship AI agents faster, with confidence" / "Trace every agent step in production."
> "Each trace contains spans representing each choice made by an agent or each step of a given workflow."
Has execution graphs, Agent Observability Insights (outlier detection), Patterns (topic clustering).

## Human-in-the-loop?
Offline only. Annotation Queues = async retrospective labeling of already-captured traces.
> "Human annotations are the ground truth that makes LLM-as-judge evaluations trustworthy."
No approval gates, no pausing/blocking of running agents.

## Durable run state / provenance?
Read-only telemetry + versioned Datasets/Experiments (up to 3-year retention). Analytical, not an authoritative control-plane state store; cannot drive/resume/gate a run.

## Buyer / deploy
Buyer: AI Engineers, Data Scientists, SRE/DevOps, eng leadership — sold into orgs already on Datadog. Deploy: SaaS only. No OSS/self-host.

## Pricing (accessed 2026-07-13)
- Base: $160/mo annual ($240 on-demand) covers first 100K LLM spans/mo.
- Additional: $3.50 per 10K spans annual ($5 on-demand).
- Retention add-ons: $1.50/$3/$4 per 10K spans for 30/60/90-day.
Only provider LLM calls billed; tool/embedding/agent spans not.

## Anecdote (unverified)
Third-party claims ~40K-span free tier and "$0.80 per 1K spans" (unverified); generic "billing explodes at scale" griping.
