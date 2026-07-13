# Factory.ai (Droids) — Missions, Mission Control, Analytics

**Accessed:** 2026-07-13
**Confidence:** HIGH (Factory official docs + factory.ai/news).

## PRIMARY SOURCES

### 1. Missions — factory.ai/news/missions
URL: https://factory.ai/news/missions
- "An AI system that pursues goals autonomously over multi-day horizons. Describe what you want, approve the scope, and come back to finished work."
- "14% of missions run longer than 24 hours. Some run for days. The longest ran for 16 days."
- Human controls: "Once you approve the plan, Droid enters Mission Control and begins execution. From there, you're the project manager: monitoring progress, unblocking workers when they get stuck, redirecting when priorities change."
- Provenance: "Git is the source of truth. Every command is classified by risk level, Droid Shield scans for secrets before anything reaches a model... Every action is logged, and telemetry flows through OpenTelemetry."
- Run view: "Mission Control showing a running mission with feature list, progress log, and validation output."

### 2. Factory Analytics — docs.factory.ai/enterprise/usage-cost-and-analytics + factory.ai/news/factory-analytics
- "Factory is built around OpenTelemetry (OTEL) so you can plug Droid directly into your existing observability stack, with optional cloud analytics."
- OTEL signals: "Counts of interactive and headless sessions, and session duration... Tokens in/out per model and provider, request counts and latencies, and error rates and retry behavior."
- "The hosted dashboard at app.factory.ai/analytics provides filtering, date range selection, and CSV export."
- "OTEL export sends all metrics to Datadog, Grafana, New Relic, Splunk, or any OTLP-compatible collector."
- Note: Analytics is usage/cost/adoption oriented (per-user, tokens, tool usage) — NOT a per-run legible timeline for a single run; the run timeline lives in Mission Control.

### 3. Pricing — docs.factory.ai/pricing
URL: https://docs.factory.ai/pricing (accessed 2026-07-13)
- Pro $20/mo ("Complete software development agents for individuals").
- Plus $100/mo (~5x Pro usage + Droid Computers remote cloud environments).
- Max $200/mo (~10x Pro usage + early access).
- Business & Enterprise: custom / contact sales; Enterprise: unlimited members, dedicated compute, on-premise deployment options.
- Rolling windows: 5-hour, weekly, monthly. Standard Usage first, then Droid Core models free, then Extra Usage ($10 minimum, no expiration).
- BYOK: "All Individual plans include an allowance of free BYOK usage."

## SURFACES
Factory App (web), Droid CLI (terminal), Desktop app, Web + Mobile, Droid SDK (embed in CI/CD). Hosted-managed with "Droid Computers" remote cloud env; Enterprise on-prem/BYO-compute + BYOK.

## PERSONA
Enterprise eng orgs; buyer = platform/eng leadership. Reportedly ~$1.5B valuation (ANECDOTE — theaiagentindex.com/rywalker, not Factory-official).
