# Weights & Biases Weave

- URL (product): https://wandb.ai/site/weave/
- URL (pricing): https://wandb.ai/site/pricing/
- URL (feedback docs): https://docs.wandb.ai/weave/guides/tracking/feedback
- Accessed: 2026-07-13
- Confidence: med-high (feedback/deploy docs 403'd, corroborated via search)

## What it is
The LLM/agent observability + eval layer of W&B: tracing, monitoring, evaluation framework, positioned explicitly around production agents.

## Agent-focused?
Yes — strongest explicit agent framing of its peer group.
> "end-to-end observability to monitor agent behavior, out-of-the-box signals to surface failure modes, and a flexible evaluation framework to prevent regressions."
> "sessions, turns, steps, tools, and sub-agents as first-class concepts"; "Deep analytics tailored for agentic systems"
Tagline: "Observability and continuous improvement for production agents."

## Human-in-the-loop?
Human annotation scorers in UI/API (AnnotationSpec), shown in "Feedback sidebar of the call details page" — offline/async review. No managed annotation queues, no live in-the-loop approvals.

## Durable run state / provenance?
Read-only traces organized into sessions/turns + eval datasets. Not authoritative actionable run state.

## Buyer / deploy
Buyer: AI/ML teams (community historically skews ML training). Deploy broadest: Multi-tenant Cloud, Dedicated Cloud (single-tenant), Self-Managed (AWS/GCP/Azure/on-prem, ClickHouse). Weave SDK OSS; backend commercial.

## Pricing (accessed 2026-07-13)
- Free: $0, 5 GB/mo storage, 1 GB/mo Weave ingest, up to 5 seats.
- Pro: starts $60/mo (teams <50 employees), 100 GB storage, 1.5 GB Weave ingest, up to 10 seats.
- Enterprise: custom.
Overage: storage $0.03/GB; Weave ingest $0.10/MB (~$100/GB — meaningful at volume).

## Anecdote (unverified)
Reddit: per-seat pricing pain (12 eng x ~$200/seat = ~$2,400/mo "for capabilities touched once a quarter" vs Langfuse Pro $199 flat); LLM-obs layer called "newer/less mature".
