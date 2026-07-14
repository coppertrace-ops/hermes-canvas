# C4 — Who actually reads traces (audience)

**Accessed:** 2026-07-13
**Type:** official/vendor blog (LangChain, Braintrust, AWS, Microsoft) + community

## Sources
- https://www.langchain.com/resources/agent-observability (vendor)
- https://www.braintrust.dev/articles/agent-observability-tracing-tool-calls-memory (vendor)
- https://www.groundcover.com/learn/observability/ai-agent-observability (vendor)
- https://learn.microsoft.com/en-us/azure/foundry/observability/concepts/trace-agent-concept (official)
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-telemetry.html (official)

## Notes
Across every source, traces are framed as tools for **internal team consumption** — developers and ops/platform engineers — for debugging, evaluating quality, detecting patterns, and managing cost. Typical framing: when a user reports "the agent gave me the wrong answer," observability gives *developers* "access to the full execution context: conversation history, retrieval results, and model reasoning" to investigate. Traces "reconstruct the execution path so **teams** can understand how a result was produced" — explicitly contrasted with "just showing end users the final output."

Secondary non-user audience: **governance/compliance** — "observability infrastructure answers 'why did the agent do that?' before regulators, auditors, or end users have to ask." Note the phrasing: the audit is done *by* internal teams *on behalf of* / *ahead of* end users; end users are not depicted reading traces themselves.

No source in this batch depicts a **non-developer end user reading a raw trace**. Traces are consistently a developer/ops/auditor artifact.

## Relevance to Hermes / Fable claim #3 (strong FOR)
This is the strongest support found for the thesis: **traces are read by developers, not end users.** If Hermes' goal is to make agent work legible to *non-developers* (PMs, analysts, auditors, the person who requested the work), a span-tree trace is the wrong surface — it targets the wrong audience. Versioned human-facing artifacts (documents/canvases with diffs) are read by the same non-developers who consume the output. Confidence: high (unanimous across official + vendor sources).
