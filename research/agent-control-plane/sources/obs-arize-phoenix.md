# Arize Phoenix (OSS)

- URL (product): https://arize.com/phoenix/
- URL (repo): https://github.com/arize-ai/phoenix
- URL (docs): https://arize.com/docs/phoenix
- Accessed: 2026-07-13
- Confidence: high

## What it is
"The open-source platform for agent development and evaluation" — free, self-hostable tracing + eval toolkit with its own OTel-compatible instrumentation (OpenInference). OSS foundation beneath Arize AX. ~9k+ GitHub stars.

## Agent-focused?
Yes.
> "Trace every step your agent takes"
> "Build evals that score outputs and catch issues before they reach your users."
Broad agent-framework coverage: OpenAI Agents SDK, Claude Agent SDK, LangGraph, Vercel AI SDK, Mastra, CrewAI, LlamaIndex, DSPy.

## Human-in-the-loop?
Offline annotation.
> "Mark what worked. Flag what broke. Add labels with human review or LLM-as-judge."
Trace/output labeling (human or LLM-judge), not live agent approval.

## Durable run state / provenance?
Read-only trace store; runs as a local Python process or Docker/K8s. Not an actable run-state engine; local-process model is less suited to sustained high-volume prod ingestion (upsell to AX).

## Buyer / deploy
Buyer: developers / AI engineers wanting free self-hosted OSS. Deploy: OSS self-host (local/Docker/K8s) + 2 free Phoenix Cloud instances. License: Elastic License 2.0 (source-available, NOT OSI-approved).

## Pricing (accessed 2026-07-13)
Free / open source. Self-host = $0 license (pay own infra). Managed scale path = separate paid Arize AX.

## Anecdote (unverified)
OSS devs: easier to self-host than Langfuse (single Docker container) but Langfuse scales better for millions of traces.
