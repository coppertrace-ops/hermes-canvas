# AGNTCY / Agent Connect + AG-UI (+ ACP disambiguation)

**Accessed:** 2026-07-13
**Confidence:** high on foundation donations; med on adoption specifics

## Sources
- LF: "Welcomes the AGNTCY Project..." (Jul 29, 2025) — https://www.linuxfoundation.org/press/linux-foundation-welcomes-the-agntcy-project-to-standardize-open-multi-agent-system-infrastructure-and-break-down-ai-agent-silos
- The Register: "Cisco donates agentic AI platform Agntcy to Linux Foundation" (Jul 30, 2025) — https://www.theregister.com/
- AG-UI docs — https://docs.ag-ui.com/introduction

## AGNTCY / Agent Connect Protocol (Cisco + LangChain + Galileo)
Open infra for multi-agent systems: discovery, identity, messaging, and **observability** across vendors. Core specs: OASF (agent schema), Agent Connect Protocol (ACP), SLIM transport.
- Open-sourced by Cisco (Outshift) Mar 2025 with LangChain + Galileo; grew to 65+ supporting companies; welcomed to LF Jul 29, 2025.
- Interoperates with A2A + MCP (A2A agents / MCP servers can be listed in AGNTCY directories).
- **HELPS or HURTS?** TAILWIND + WATCH AS COMPETITOR. It's the one standard that explicitly names observability as shared infra — validates the category, but a Cisco-led open project could commoditize the plumbing layer. Its SDKs are something to build on. It is infrastructure, not a HITL control product.

## AG-UI — Agent–User Interaction Protocol (CopilotKit)
Event-stream contract between agent runtime and user-facing frontend (SSE); ~17 typed events (streaming tokens, TOOL_CALL, STATE_DELTA, lifecycle).
- "AG-UI is an open, lightweight, event-based protocol that standardizes how AI agents connect to user-facing applications."
- "standardizes how agent state, UI intents, and user interactions flow between your model/agent runtime and user-facing frontend applications."
- "AG-UI was born from CopilotKit's initial partnership with LangGraph and CrewAI."
- Integrations: LangGraph, CrewAI, Microsoft Agent Framework, Google ADK, AWS Strands, Mastra, Pydantic AI, LlamaIndex. Oracle adopted it (reporting).
- Governance: CopilotKit-led; not (yet) under a neutral foundation (low confidence on formal governance).
- **HELPS or HURTS?** MILD TAILWIND (adjacent). A standardized live agent→UI event stream to surface activity and inject human input/approvals. Complements OTel (backend traces) with a real-time UI layer. CopilotKit is an adjacent potential competitor if it moves up into controls.

## ACP disambiguation
Two different "ACP": IBM/BeeAI **Agent Communication Protocol** (merged into A2A, Aug 2025 — see proto-a2a.md) vs Cisco/AGNTCY **Agent Connect Protocol** (above, separate). Do not conflate.
