# Comet Opik

- URL (product): https://www.comet.com/site/products/opik/
- URL (pricing): https://www.comet.com/site/pricing/
- URL (annotation queues doc): https://www.comet.com/docs/opik/evaluation/annotation_queues
- URL (repo): https://github.com/comet-ml/opik
- Accessed: 2026-07-13
- Confidence: high (1,2,5,6,7); med-high (3,4). Note unverified $39 overage figure.

## What it is
Open-source, end-to-end LLM/agent observability, evaluation, and optimization platform by Comet.
> "Opik logs every step your agent takes, from user interactions to context retrieval and tool calls — with automated eval workflows to find and fix errors across development, testing, and production."

## Agent-focused?
Yes, explicitly, throughout. Agent traces, multi-step run views, agent evals, dashboards; dedicated Opik Agent Optimizer SDK; Agent Playground; integrations (OpenAI Agents, LangChain, CrewAI, AutoGen, AG2).
> "Capture, visualize, and understand every action your agent takes"

## Human-in-the-loop?
Async annotation queues over logged traces + LLM-as-judge online scoring — NOT live approval gating.
> "collections of traces or threads that need human review and feedback"
No interrupt-and-resume / approve-a-tool-call-before-it-runs primitive.

## Durable run state / provenance?
Persistent + provenance-rich but review/annotate-oriented: traces, spans, feedback scores, token usage, prompt/version history, audit logs ("Automatically produce audit logs for your governance team"), ClickHouse-class store. Not an authoritative run-state object you programmatically steer/resume.

## Buyer / deploy
Buyer: AI/ML eng + LLM/agent devs (SDK-first Python+TS); secondary platform/infra + governance/QA/SMEs. Deploy full spectrum: OSS Apache-2.0 (Docker Compose or K8s/Helm) + managed SaaS + Enterprise/hybrid.

## Pricing (accessed 2026-07-13)
- Open Source: $0, self-hosted, unlimited spans.
- Free Cloud: $0, up to 10 members, 25k spans/mo, 60-day.
- Pro Cloud: $19/mo, up to 50 members, 100k spans/mo, 60-day.
- Enterprise: contact-sales.
(Search snippet "$39/mo + $5 per 100k spans" NOT confirmed on live page = $19; treat as unverified.)

## Anecdote (unverified)
~12,500 GitHub stars in ~8-9 months (vendor-sourced). Little neutral community sentiment surfaced.
