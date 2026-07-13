# Google Agent Development Kit (ADK)

**Accessed:** 2026-07-13
**Confidence:** high (official ADK docs)

## Sources
- ADK docs home — https://adk.dev/ (formerly google.github.io/adk-docs, now 301→adk.dev)
- Cloud Trace observability for ADK — https://adk.dev/integrations/cloud-trace/
- API reference — https://adk.dev/api-reference/python/
- BigQuery Agent Analytics plugin — https://adk.dev/integrations/bigquery-agent-analytics/

## What it is
Open-source agent framework (free). Built-in Evaluation (Criteria, User/Environment Simulation, Custom Metrics, Optimization) + built-in OpenTelemetry.

## CRITICAL: model-agnostic (NOT Gemini-locked)
- "ADK can work with almost any generative AI model. The framework provides easy access to Gemini as well as other leading models, and we provide adapters that let you connect with many other models and model providers, including locally running models."
- Listed model support: Gemini, Gemma, Claude, hosted models, Apigee AI Gateway, Ollama, vLLM.

## Native tracing (Cloud Trace / OpenTelemetry)
- "Cloud Trace is built on OpenTelemetry, an open-source standard that supports many languages and ingestion methods for generating trace data."
- ADK ≥1.17.0 has built-in OpenTelemetry; export to Cloud via `--otel_to_cloud` flag on `adk web`. (Search-surfaced, med.)

## HITL
- `ToolConfirmation` class (confirmed, hint, payload) for tool-confirmation flows; supports pausing for human input and resuming after approval. BigQuery Agent Analytics plugin adds HITL tracing event types (credential requests, confirmation prompts, user-input requests). (Med-high.)

## Assessment
- **Native traces?** Yes, built-in OTel → Cloud Trace. **Model-locked?** No — explicitly cross-model. **Dev vs operator?** Developers. **Pricing?** Free/open-source; costs from underlying model + Cloud services.
- Notable: ADK is the clearest lab example of a first-party framework that emits STANDARD OpenTelemetry telemetry and supports competitor models — a tailwind for independent ingestion.
