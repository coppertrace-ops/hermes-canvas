# OpenAI Native Traces & Evals (+ deprecation) & Responses/Assistants

**Accessed:** 2026-07-13
**Confidence:** high (developers.openai.com / platform.openai.com docs fetched cleanly)

## Sources
- Trace grading guide — https://developers.openai.com/api/docs/guides/trace-grading
- Agent evals guide — https://developers.openai.com/api/docs/guides/agent-evals
- Traces dashboard — https://platform.openai.com/traces
- Deprecations — https://developers.openai.com/api/docs/deprecations
- Responses API — https://developers.openai.com/blog/responses-api
- Evals→Promptfoo migration — https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo

## Native traces (today)
- "navigate to Logs > Traces. Select a workflow." A trace "captures the end-to-end record of model calls, tool calls, guardrails, and handoffs for one run."
- Human-in-the-loop grading: "Trace grading is the process of assigning structured scores or labels to an agent's trace... to assess correctness, quality, or adherence." Workflow: "Select Grade all" → add test criteria, add runs.

## CRITICAL: Evals product being WOUND DOWN (announced 2026-06-03)
- "OpenAI is winding down the Evals product and recommends Promptfoo for continuing and extending your evaluation workflows."
- Timeline: read-only Oct 31, 2026; API + dashboard shut down Nov 30, 2026. OpenAI published an official migration guide to a THIRD-PARTY tool (Promptfoo).

## Responses API (strategic core)
- Launched Mar 11, 2025: "A faster, more flexible, and easier way to create agentic experiences that combines the simplicity of Chat Completions with the tool use and state management of the Assistants API." Successor to Assistants.

## Assistants API deprecation
- Announced Aug 26, 2025; shutdown **Aug 26, 2026**. Migrate to Responses + Conversations API. (Confidence high.)

## Assessment
Native trace logging + human-graded evals EXIST today, but the native Evals product and visual Agent Builder run surface both sunset **Nov 30, 2026**, with evals explicitly handed to a third party (Promptfoo). Trace logging survives via Agents SDK/Responses API. This is a visible first-party retreat from native agent observability/eval tooling — an opening for independents.
