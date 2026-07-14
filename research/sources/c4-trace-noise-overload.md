# C4 — Trace noise / span overload complaints

**Accessed:** 2026-07-13
**Type:** vendor eng-blog (Traceloop, Braintrust, Comet, Agenta) + community

## Sources
- https://www.traceloop.com/blog/understanding-traces-and-spans-in-llm-applications (vendor)
- https://www.braintrust.dev/articles/llm-observability-guide (vendor)
- https://agenta.ai/blog/the-ai-engineer-s-guide-to-llm-observability-with-opentelemetry (vendor)
- https://www.patronus.ai/llm-testing/llm-observability (vendor)

## Notes
Recurring theme: **traces get overwhelming at scale.** "At any meaningful scale, capturing every trace for every request becomes expensive both in storage costs and **in the noise it adds when you're trying to debug a specific issue.**"

Specific noise sources: "More instrumentation is not always better. **Framework internals and generic HTTP spans often add noise to the trace tree without providing meaningful insight into LLM behavior.**" Complex agent workflows "generate traces that grow quickly in size"; many APM backends can't store/query them efficiently.

Mitigations proposed (themselves evidence of the problem): **sampling** (trace 100% early, drop to a percentage later, force-full only on errors/slow/subset of users), **selective instrumentation** (hand-pick functions to trace), and **AI-powered trace analysis** because "manually analyzing and reviewing a large number of traces and spans is time-consuming and doesn't scale well."

## Relevance to Hermes / Fable claim #3 (FOR)
Multiple vendors admit that reading raw traces "doesn't scale," that trace trees are noisy with framework/HTTP internals, and that you need sampling or an AI to summarize them. This is a legibility failure of the trace surface itself. A versioned artifact sidesteps this: the diff shows only what changed in the human-facing output, not every internal span. Confidence: med-high (consistent across independent vendor blogs; each has product incentive so flag mild bias).
