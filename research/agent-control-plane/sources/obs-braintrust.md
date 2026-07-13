# Braintrust (braintrust.dev)

- URL (product): https://www.braintrust.dev/
- URL (pricing): https://www.braintrust.dev/pricing
- URL (human review): https://www.braintrust.dev/docs/guides/human-review
- Accessed: 2026-07-13
- Confidence: high

## What it is
AI observability + evaluation platform: tracing, evals, prompt management, CI-gating in one product. Eval-first positioning.

## Agent-focused?
Partial / not agent-exclusive. Homepage "Build with agents"; inspects "prompts, responses, and tool calls" but core identity is eval/scoring across all LLM apps.
> "Surface patterns in production, turn them into evals, and improve quality with every release"
> "Designed specifically for AI observability so you can query millions of traces quickly"

## Human-in-the-loop?
Strongest structured human review of its peer group, but review/annotation of captured traces, NOT live approval gating of a running agent.
> "Capture structured human judgment on production traces to build ground truth, validate automated scores, and surface edge cases your scorers miss."
No annotation queues / approvals-in-the-loop / live review of active runs in docs.

## Durable run state / provenance?
Read-only traces + curated datasets. Production signals become evals/datasets, not authoritative run state.

## Buyer / deploy
Buyer: AI/ML + product eng, enterprise-leaning (Vercel, Notion, Coursera, Dropbox, Replit). Deploy: SaaS + Enterprise self-host/hybrid ("Deploy Brainstore data plane on your own infrastructure"). Not OSS.

## Pricing (accessed 2026-07-13)
- Starter: $0/mo ($10 credits), 1 GB then $4/GB, 10k scores then $2.50/1k, 14-day.
- Pro: $249/mo ($249 credits), 5 GB then $3/GB, 50k scores then $1.50/1k, 30-day.
- Enterprise: contact-sales.
Human review: 1/project (Starter), unlimited (Pro+).

## Anecdote (unverified)
Praised for eval/dataset/CI-gating loop; criticized as pricey vs logging-first rivals, not OSS. A "1M spans free" claim contradicts official page — use official.
