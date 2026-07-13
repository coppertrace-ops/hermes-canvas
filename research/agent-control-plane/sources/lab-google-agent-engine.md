# Google Vertex AI Agent Engine (now "Gemini Enterprise Agent Platform")

**Accessed:** 2026-07-13
**Confidence:** high (docs + Nov 2025 Google Cloud blog)

## Sources
- Agent Engine overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview
- "More ways to build, scale, and govern AI agents with Vertex AI Agent Builder" (blog, Nov 5, 2025) — https://cloud.google.com/blog/products/ai-machine-learning/more-ways-to-build-and-scale-ai-agents-with-vertex-ai-agent-builder
- Set up tracing — https://docs.cloud.google.com/agent-builder/agent-engine/manage/tracing
- Monitor an agent — https://docs.cloud.google.com/agent-builder/agent-engine/manage/monitoring

## What it is
Fully managed agent runtime + Sessions + Memory Bank (state/long-term memory) + Example Store + Evaluation Service.
- "Utilizing a fully managed Agent Runtime to deploy and scale agents efficiently without the need to manage underlying infrastructure."
- "Leveraging the Example Store and Evaluation Service to test, monitor, and trace agent behavior, creating a continuous feedback loop."

## CRITICAL: native dashboards + traces — YES
- (Blog) "Track key agent performance metrics with a dashboard that measures token consumption, latency, error rates, and tool calls over time."
- (Blog) "Find and fix production issues faster in a traces tab so you can dive into flyouts to visualize and understand the sequence of actions your agents are taking."
- (Blog) "Interact with your deployed agent (including past sessions or issues) with a playground to dramatically shorten your debug loop."
- (Tracing doc) "Cloud Trace lets you analyze the performance of your agents by tracing the timeline of operations for each query." Built on Cloud Trace / OpenTelemetry; console "Traces" tab for deployed agents.

## Assessment answers
- **Native run dashboard/traces?** Yes — built-in Cloud Monitoring metrics dashboard + console Traces tab + playground. High.
- **Model-locked?** Agent Engine can host non-Gemini frameworks (LangGraph); but tightest experience is Gemini-centric (Memory Bank extraction uses Gemini). ADK (separate file) is model-agnostic.
- **Dev vs operator?** Developer/technical build-and-deploy layer.
- **Pricing:** Sessions/Memory Bank GA and billed; runtime charges began Nov 6, 2025; added services Jan 28, 2026. Exact rates NOT captured — see live pricing page. (Med.)
