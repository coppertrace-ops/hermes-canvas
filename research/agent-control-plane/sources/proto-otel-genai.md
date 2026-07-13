# OpenTelemetry GenAI / Agent Semantic Conventions — KEY

**Accessed:** 2026-07-13
**Confidence:** high (spec on GitHub); high that it is still experimental

## Sources
- OTel GenAI semconv spans — https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md
- Overview redirect — https://opentelemetry.io/docs/specs/semconv/gen-ai/
- (Reporting) OTel blog "AI Agent Observability" / GenAI Observability SIG; Traceloop docs; Datadog blog.

## What it standardizes
Vendor-neutral schema for GenAI/agent **traces, spans, metrics, attributes** — exact span names, attribute names, enums, units for LLM calls, agent ops, tools, memory, retrieval, workflows.
- Defined `gen_ai.operation.name` values (verbatim): `chat`, `generate_content`, `text_completion`, `embeddings`, `create_agent`, `invoke_agent`, `execute_tool`, `create_memory`, `update_memory`, `delete_memory`, `upsert_memory`, `search_memory`, `retrieval`, `plan`, `invoke_workflow`.
- "This span represents a client call to Generative AI model or service that generates a response or requests a tool call based on the input prompt."

## Status & contributors
- **Experimental / "Development" status** as of early–mid 2026; versioned opt-in (`gen_ai_latest_experimental`). Expect churn; pin a convention version.
- GenAI Observability SIG (started Apr 2024). Contributors: Amazon, Elastic, Google, IBM, Langtrace, Microsoft, OpenLIT, Scorecard, Traceloop.
- Adoption: Datadog "natively supports OpenTelemetry GenAI Semantic Conventions"; Traceloop/OpenLLMetry, Langtrace, OpenLIT, Elastic emit/ingest. (Med on breadth.)

## HELPS or HURTS? — the crux
**Strong TAILWIND for ingestion, with a commoditization caveat.**
- Tailwind: if every framework (ADK, Agent Framework, LangGraph, CrewAI...) emits OTel GenAI spans with a common vocab, ingesting "any agent's telemetry" is near-commodity — adapters collapse from N proprietary formats to one standard + thin shims.
- Caveat: parsing OTLP is table-stakes for EVERYONE (Datadog, Grafana, Elastic, labs' native consoles). Standardization commoditizes observation and lowers switching costs generally. Still experimental → schema churn.
- Verdict: standard makes the plumbing cheap; it does NOT build the control plane. Differentiate ABOVE ingestion — cross-vendor HITL control, policy gating on `execute_tool` spans, run replay/legibility across competing labs.
