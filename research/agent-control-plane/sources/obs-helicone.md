# Helicone (helicone.ai)

- URL (product): https://www.helicone.ai/
- URL (pricing): https://www.helicone.ai/pricing
- URL (self-host): https://docs.helicone.ai/getting-started/self-host/manual
- Accessed: 2026-07-13
- Confidence: med-high (unit overage rates not published)

## What it is
Open-source LLM observability + AI gateway: one-line integration to log/monitor/analyze LLM requests plus routing/caching. YC W23.
> "Open-source LLM observability and monitoring platform."
> "The world's fastest-growing AI companies rely on Helicone to route, debug, and analyze their applications."

## Agent-focused?
Weakest / request-centric of the segment. Has "Sessions" and "Users" for some multi-step grouping, but fundamentally per-request logging, not agent-run dashboards or agent evals. Features: Dashboard, Requests, Segments, Sessions, Users, Prompts, Datasets, Playground, Rate Limits, Alerts.

## Human-in-the-loop?
None. No human review, approval queues, or annotation on product/pricing pages.

## Durable run state / provenance?
Read-only request logs + datasets. No authoritative run state.

## Buyer / deploy
Buyer: developers / fast-growing AI cos wanting fast cost + request visibility (most self-serve). Deploy: SaaS + true OSS self-host (one-line Docker Compose, GitHub helicone/helicone); on-prem on Enterprise.

## Pricing (accessed 2026-07-13)
- Hobby: $0, 10,000 free requests, 1 GB, 1 seat.
- Pro: $79/mo, unlimited seats, alerts/reports, HQL ("usage-based pricing applies").
- Team: $799/mo, 5 orgs, SOC-2 & HIPAA.
- Enterprise: contact-sales (SAML SSO, on-prem).
Per-request/log overage rates NOT published (calculator only) = unknown/contact.

## Anecdote (unverified)
Praised: trivially easy to self-host (Docker Compose, runs on t2.medium). Limitation: request-centric, not built for deep agent graphs or production eval loops.
