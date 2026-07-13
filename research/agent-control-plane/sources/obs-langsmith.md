# LangSmith (LangChain)

- URL (product): https://www.langchain.com/langsmith
- URL (pricing): https://www.langchain.com/pricing
- Accessed: 2026-07-13
- Confidence: high

## What it is
LangChain's commercial "Agent & LLM Observability Platform": tracing, monitoring, evaluating, debugging LLM/agent apps. Framework-agnostic SDKs but tightly coupled to LangChain/LangGraph.

## Agent-focused?
Yes, explicitly and prominently agent-first.
> "LangSmith Observability gives you complete visibility into agent behavior."
> "See exactly what your agent is doing step by step. Pinpoint the issues hurting latency, cost, and response quality."

## Human-in-the-loop?
Offline only within LangSmith: "Annotation queue (human feedback)" + online/offline evals = retrospective trace labeling. TRUE live approve/pause/resume of a running agent is a separate product, LangGraph Platform:
> "An interrupt for human-in-the-loop creates a separate deployment run when resuming."

## Durable run state / provenance?
LangSmith = read-only traces. Durable, resumable, actable run state lives in the sister product LangGraph Platform, not in the observability tool.

## Buyer / deploy
Buyer: AI/ML + app engineers, enterprise dev teams (Klarna, Uber, LinkedIn, Coinbase). Deploy: SaaS primary; self-host + hybrid on Enterprise.

## Pricing (accessed 2026-07-13)
- Developer: $0, 1 seat, 5,000 base traces/mo, PAYG after.
- Plus: $39/seat/mo, unlimited seats, 10,000 base traces/mo.
- Enterprise: contact-sales (self-host + hybrid).
- Overage: base traces $2.50/1k (14-day retention); extended $5.00/1k (400-day).

## Anecdote (unverified)
Reddit/third-party: hosted pricing hidden pre-login ("dark pattern"); trace-based billing scales with agent chattiness, not value = unpredictable cost.
