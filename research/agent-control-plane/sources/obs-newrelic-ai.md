# New Relic AI Monitoring (AIM)

- URL (product): https://newrelic.com/platform/ai-monitoring
- URL (docs): https://docs.newrelic.com/docs/ai-monitoring/intro-to-ai-monitoring/
- URL (pricing): https://newrelic.com/pricing
- URL (agentic launch): https://newrelic.com/press-release/20251104-0
- Accessed: 2026-07-13
- Confidence: high (core pricing); med (Nov'25 agentic/MCP features in limited preview)

## What it is
APM extended to AI.
> "AI monitoring is our solution for application monitoring (APM) for AI" — "end-to-end visibility into performance, cost, and quality of supported models."

## Agent-focused?
Yes, expanded via a Nov 4 2025 "Agentic AI Monitoring + MCP Server" launch.
> "When your application runs a multi-step agentic workflow, New Relic captures the full execution, every agent invocation, every tool call, every handoff."
> "New Relic adds AI agents and AI tools as first-class entities in the entity map."
Agents Service Map; supports LangGraph, Strands, AutoGen; monitors full MCP lifecycle. Trace/service-map views, not an operational run-control dashboard.

## Human-in-the-loop?
Offline end-user feedback only.
> "If you've enabled the feedback feature, you can scope the graphs to analyze responses by positive and negative feedback" (thumbs up/down via your app code).
Quality signals are automated scorers (hallucination/bias/toxicity, RAG relevance). No live human review, approval gates, or annotation queues.

## Durable run state / provenance?
Read-only telemetry (traces, spans, events, metrics, entities). No authoritative/resumable run-state store; observes after the fact.

## Buyer / deploy
Buyer: AI/ML + full-stack devs; secondary platform/DevOps/SRE; exec CIO/CTO framing. Deploy: SaaS (US/EU DCs). Not OSS/self-host.

## Pricing (accessed 2026-07-13)
- Data ingest: 100 GB/mo free, then $0.40/GB (Original) / $0.60/GB (Data Plus); EU +$0.05/GB.
- Users: Basic free; Core $49/user; Full Platform Pro $349/user annual ($418.80 PAYG); Enterprise custom.
- AIM bundled (no separate SKU); Nov'25 agentic/MCP features in limited preview, pricing undisclosed.
