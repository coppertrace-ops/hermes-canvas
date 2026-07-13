# LangGraph / LangSmith Deployment / Studio / Agent Inbox (LangChain)

- **Accessed:** 2026-07-13
- **Type:** Primary (official langchain.com + docs.langchain.com + GitHub)
- **Confidence:** high

## Naming (2026)
- **LangGraph** = OSS framework (Python/JS) for stateful orchestrated agent graphs.
- **LangSmith Deployment** = managed run platform (formerly "LangGraph Platform"; rebranded ~Oct 2025).
- **LangSmith Studio** = agent IDE (formerly "LangGraph Studio").
- **Agent Inbox** = separate OSS UI for human-in-the-loop agents.

## Hosted run control plane: YES
- One-click deploy; durable execution across restarts; Agent Server API + thread/checkpoint model.
- Studio: "Visualize your graph architecture"; "Run and interact with your agent"; "Manage threads"; "Debug agent state via time travel."
- Run observability via integrated LangSmith tracing.

## HITL / approval gates: YES (strength)
- LangGraph interrupts; "Review, edit, and approve actions."
- Agent Inbox: "An inbox UX for interacting with human-in-the-loop agents." Per-interrupt actions: **Accept, Edit, Respond, Ignore** (flags allow_ignore/allow_respond/allow_edit/allow_accept).

## Durable state & provenance: YES (strong)
- "Persistent checkpoints with up to 25 MB payloads"; state isolation for subagents; threads; time-travel replay.

## Multi-agent: YES (subagents, supervisor graphs).

## Buyer / deploy
- Buyer: developer-first → enterprise ops.
- Deploy: Cloud ("Fully managed") / Self-hosted (Enterprise, "Full control ... in your infrastructure") / Hybrid ("runs Agent Servers in your infrastructure while sending traces to either Cloud or Self-hosted LangSmith").

## PRICING (langchain.com/pricing — now unified LangSmith pricing)
- Developer: "$0 / seat per month then pay as you go"; up to 5k base traces/mo; 1 seat; no deployment.
- Plus: "$39 / seat per month then pay as you go"; up to 10k base traces/mo; **1 free Dev deployment, unlimited runs**.
  - "$0.005 / deployment run"; "$0.0036 / min per Production deployment"; "$0.0007 / min per Development deployment".
  - Fleet: "500 / mo included", then "$0.05 / Fleet run".
  - Engine: "$1.50 / LCU" (LangChain Compute Unit).
  - Sandbox: CPU "$0.0576 / vCPU-hr", Memory "$0.0185 / GiB-hr", Storage "$0.000123 / GiB-hr".
- Enterprise: custom.

## Sources
- https://www.langchain.com/pricing (high)
- https://www.langchain.com/langgraph-platform (high) — "the open-source framework for building stateful, orchestrated agent workflows" vs "the managed service for running those agents at scale in production"; "Persistent checkpoints with up to 25 MB payloads"; "Review, edit, and approve actions."
- https://docs.langchain.com/langgraph-platform/langgraph-studio (high)
- https://docs.langchain.com/langgraph-platform/deployment-options (high)
- https://github.com/langchain-ai/agent-inbox (high)

## Relevance to Hermes
Most mature run-control-plane + HITL story in this segment. NEAR-DIRECT: durable checkpoints, time-travel, and a human inbox with fine-grained gate actions. But developer/graph-IDE-first; legibility is debug-oriented (graph viz) rather than a human-first narrative workspace.
