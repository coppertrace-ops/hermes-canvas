# C4 — Langfuse trace data model & UI

**Accessed:** 2026-07-13
**Type:** official (langfuse.com/docs)

## Sources
- https://langfuse.com/docs/observability/overview (official)
- https://langfuse.com/docs/observability/features/token-and-cost-tracking (official)
- https://langfuse.com/docs/observability/features/observation-types (official)
- https://github.com/orgs/langfuse/discussions/9116 and /8330 (community: nested-span pain)

## Notes
Data model: a **trace** = one end-to-end request (usually one user interaction). Inside it are **observations** of three types: **span** (timed unit of work, e.g. a tool call), **generation** (specialized span for a single LLM call, carrying model name, prompt, completion, token usage, cost), and **agent** (decides application flow, uses tools with LLM guidance). Because generations are just specialized spans, the whole structure is a **tree of timed nodes with model calls at the leaves**, rendered in the UI as a **waterfall**.

Token & cost: usage_details (input/output tokens) feed a built-in model pricing table; dashboard shows total tokens and dollars **per trace, per user, per model, over time** — "turning cost from an end-of-month surprise into a live metric."

**Community pain (flag):** GitHub discussions report nested spans getting mis-attached to the trace root instead of their intended parent (broken nesting), and that **decorator-based tracing observes function boundaries, not logic boundaries** — so conditional flows, loops, retries, branching, and agent decisions are hidden unless manually wrapped. Complex dynamic pipelines require explicitly deciding what to trace and how to group it.

## Relevance to Hermes / Fable claim #3
Confirms traces are excellent at **quantitative** legibility (latency, tokens, cost, causality/timing) but the *instrumentation itself is fiddly* and can misrepresent structure. The trace shows the *machinery*, not the *artifact a human wants to inspect*. Confidence: high (official for model; med for pain, community-sourced).
