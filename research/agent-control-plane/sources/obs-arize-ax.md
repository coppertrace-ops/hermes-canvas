# Arize AX (commercial)

- URL (product): https://arize.com/
- URL (pricing): https://arize.com/pricing/
- Accessed: 2026-07-13
- Confidence: high (tiers/quotes); low ($60k/yr enterprise figure is third-party)

## What it is
Arize's commercial "AI native platform for agent observability, evaluation, and improvement" — paid enterprise tier above OSS Phoenix. Adds session/span tracing, LLM-as-judge, drift detection, alerting, and AI debug assistant "Alyx".

## Agent-focused?
Yes — most explicitly agent-first framing of the incumbents.
> "Signal: automatically find failure modes in your agents"
> "Agent trajectory visualizations (path and graph)"
> "Trace Evals: Evaluate agent trajectories" / "Agent as a judge"

## Human-in-the-loop?
Offline annotation, not live-run approval.
> "Human annotations and feedback" + "Labeling queues" (unlimited across tiers)
Reviewer labeling of traces/spans + AI assistant (Alyx) for debugging. No live pause/approve.

## Durable run state / provenance?
Span/session trace store with evals + alerting (PagerDuty/Slack). Ingests OTel/OpenInference spans, evaluates trajectories, alerts. Does NOT hold authoritative resumable run state.

## Buyer / deploy
Buyer: enterprise AI/ML + platform eng needing SOC2/GDPR/HIPAA, marketplace procurement. Deploy: SaaS (Pro); Enterprise custom SaaS or self-host; Phoenix is OSS path.

## Pricing (accessed 2026-07-13)
- Free: $0, 25k spans/mo, 1 GB, 15-day retention.
- Pro: $50/mo, 50k spans/mo, 10 GB, 30-day.
- Enterprise: contact-sales (self-host option).

## Anecdote (unverified)
Third-party cites ~$60k/yr median enterprise cost — NOT official, do not cite as fact.
