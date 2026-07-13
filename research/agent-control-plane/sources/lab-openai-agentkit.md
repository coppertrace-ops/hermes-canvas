# OpenAI AgentKit / Agent Builder / ChatKit

**Accessed:** 2026-07-13
**Confidence:** high (official docs); med on exact launch-page verbatim (openai.com/index/* returns HTTP 403 to fetch)

## Sources
- Introducing AgentKit — https://openai.com/index/introducing-agentkit/ (403 to fetch; substance corroborated via cookbook)
- AgentKit cookbook walkthrough — https://developers.openai.com/cookbook/examples/agentkit/agentkit_walkthrough
- Agent Builder guide — https://developers.openai.com/api/docs/guides/agent-builder
- ChatKit guide — https://platform.openai.com/docs/guides/chatkit
- Deprecations page — https://developers.openai.com/api/docs/deprecations

## What it is
AgentKit announced at DevDay, **Oct 6, 2025**: "a complete set of tools for developers and enterprises to build, deploy, and optimize agents." Components: **Agent Builder** (visual node canvas), **ChatKit** (embeddable chat UI), **Connector Registry**, plus Guardrails + Evals.

## Verbatim quotes
- Availability at launch: "ChatKit and the new Evals capabilities are generally available to all developers, while Agent Builder is available in beta and Connector Registry is beginning its beta rollout to some API, ChatGPT Enterprise and Edu customers."
- Agent Builder run visibility (cookbook): "Preview lets you interact with your workflow the same way a chat user would, from directly within Agent Builder." Preview steps "step-by-step through each node."
- ChatKit: "ChatKit is the best way to build agentic chat experiences... embeddable UI widgets... tool-invocation support... and chain-of-thought visualizations."

## CRITICAL: Agent Builder DEPRECATION (announced 2026-06-03)
Guide banner: "OpenAI is deprecating Agent Builder... the product is scheduled to shut down on November 30, 2026." Migration: "Migrate from Agent Builder to continue with the Agents SDK or ChatGPT Workspace Agents." (Confidence: high — corroborated on official deprecations page.)

## Assessment answers
- **Native run dashboard/traces?** Yes — visual node preview + Logs>Traces (see lab-openai-traces-evals.md). BUT visual Agent Builder surface is being sunset (Nov 30, 2026).
- **Model-locked?** Yes — first-party visual surface uses OpenAI models only (gpt-5.x). Cross-model only via dropping to open-source Agents SDK w/ compat endpoint (unofficial).
- **Dev vs operator?** Developers/technical builders; non-technical users pushed to ChatGPT Workspace Agents.
- **Pricing:** design free; pay standard API usage on run. ChatKit GA; Connector Registry beta.
