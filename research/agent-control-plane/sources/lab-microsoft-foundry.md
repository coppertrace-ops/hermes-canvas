# Microsoft Foundry Agent Service + Agent Framework + Observability + Entra Agent ID

**Accessed:** 2026-07-13
**Confidence:** high on capabilities; med on exact GA/preview lines

## Sources
- "What is Microsoft Foundry Agent Service?" (Learn, upd. 2026-07-09) — https://learn.microsoft.com/en-us/azure/foundry/agents/overview
- "Observability in Generative AI - Microsoft Foundry" (Learn, upd. 2026-06-02) — https://learn.microsoft.com/en-us/azure/foundry/concepts/observability
- Agent Framework intro — https://devblogs.microsoft.com/foundry/introducing-microsoft-agent-framework-the-open-source-engine-for-agentic-ai-apps/
- Agent Framework 1.0 (Apr 3, 2026) — https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/
- Entra Agent ID (Learn, upd. 2026-06-24) — https://learn.microsoft.com/en-us/entra/agent-id/what-is-microsoft-entra-agent-id

## Foundry Agent Service (managed runtime, cross-model)
- "Foundry Agent Service is a managed platform for building, deploying, and scaling AI agents. Use any framework, any supported model from the Foundry model catalog, and the Responses API as a single entry point."
- Cross-model: "Works with many models from the Foundry model catalog, such as GPT-4o, Llama, and DeepSeek. Swap models without changing your agent code."
- Observability: "End-to-end tracing, metrics, and Application Insights integration. See every decision your agent makes."

## Foundry Observability (native dashboards/traces/evals) — CRITICAL
- "Integrated with Azure Monitor Application Insights, Microsoft Foundry delivers real-time dashboards tracking operational metrics, token consumption, latency, error rates, and quality scores."
- "Distributed tracing captures the execution flow... LLM calls, tool invocations, agent decisions... Built on OpenTelemetry standards... supports tracing for popular frameworks including LangChain, LangGraph, the OpenAI Agents SDK, and the Microsoft Agent Framework."
- Built-in evaluators incl. "agent-specific metrics (tool call accuracy, task completion)."

## Agent Framework (open-source SDK) + Entra Agent ID
- "open-source SDK and runtime... unifies the enterprise-ready foundations of Semantic Kernel with the innovative orchestration of AutoGen." "Observability is richer and simpler, with OpenTelemetry support out of the box." v1.0 GA Apr 3, 2026; "multi-provider model support, and cross-runtime interoperability via A2A and MCP."
- Entra Agent ID: "identity and security framework that extends Microsoft Entra capabilities to AI agents." "All agent authentication and activity is logged for compliance and audit." Governs "third-party agents from platforms such as AWS Bedrock and n8n."

## Assessment
- **Native dashboard/traces/HITL/provenance?** Yes on all — richest first-party native observability of the labs (OTel-based tracing, real-time dashboards, evals, Entra identity/audit). HITL via guardrails + "human-in-the-loop processes."
- **Model-locked?** NO — explicitly cross-model (Foundry catalog) + cross-framework (LangGraph, OpenAI Agents SDK, Anthropic Agent SDK). Entra Agent ID governs even non-MS agents.
- **Dev vs operator?** Developer-first; Entra Agent ID / Agent 365 reach toward IT-admin governance.
- **Pricing:** Observability consumption-billed; Agent Framework free/open-source.
