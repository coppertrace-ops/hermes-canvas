# Source: LangChain Agent Inbox + LangGraph interrupt() HITL

- **URLs:**
  - https://docs.langchain.com/oss/python/langchain/human-in-the-loop (HITL middleware docs)
  - https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt (blog)
  - https://github.com/langchain-ai/agent-inbox (Agent Inbox UI, OSS)
- **Accessed:** 2026-07-13
- **Type:** PRIMARY (vendor docs/blog/repo)
- **Confidence:** high

## What it is
LangGraph's `interrupt()` pauses a graph mid-run and persists state via a checkpointer; the human decision determines next step. **Agent Inbox** = open-source, Gmail/inbox-style UI (built by LangChain) to review, approve, edit, or reject queued agent interrupts.

## Verbatim
- "The Human-in-the-Loop (HITL) middleware lets you add human oversight to agent tool calls... the middleware can pause execution and wait for a decision." (docs, per search)
- Decision types: "approved as-is (approve), modified before running (edit), rejected with feedback (reject), or responded to directly (respond)."
- interrupt(): "it will pause execution of the graph, mark the thread you are running as `interrupted`." (blog)
- "Pause the graph before a critical step, such as an API call, to review and approve the action." (blog)
- "You must configure a checkpointer to persist the graph state across interrupts... in production, use a persistent checkpointer like AsyncPostgresSaver." (docs)

## HITL model
Blocking **interrupt-based** approval gates, tool-scoped (True/False/InterruptOnConfig per tool). State persisted (durable). Provenance = graph state/thread, developer-visible.

## Buyer / persona / deploy / price
Developer (LangGraph builder). Self-host OSS Agent Inbox; production via LangGraph Platform. Agent Inbox itself free/OSS.
