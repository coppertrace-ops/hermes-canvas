# Inngest AgentKit + Inngest durable execution

- **Accessed:** 2026-07-13
- **Type:** Primary (inngest.com, agentkit.inngest.com)
- **Confidence:** high

## What it is
- **Inngest** — durable-execution platform (event-driven functions, steps, retries, flow control) with a hosted dashboard.
- **AgentKit** — OSS TS agent framework by Inngest: Agents composed into **Networks** with a **Router**; runs on Inngest's durable engine.

## Hosted run control plane: YES
- Inngest provides a hosted dashboard with step-level tracing, run history, real-time updates. `useAgent` React hook streams live updates to the browser. "step-level tracing." Runs "for hours or days."

## HITL / approval gates: YES (documented pattern)
- "you can create Tools that can wait for human input. The ask_developer tool will wait up to 4 hours for a 'developer.response' event ... pausing the execution of the AgentKit network." (waitForEvent primitive.)

## Durable state & provenance: YES
- Durable execution: automatic retries, step memoization/replay, step-level tracing. Survives rate limits/LLM failures.

## Multi-agent: YES (Networks + Router; single- or multi-agent systems).

## Buyer / deploy
- Buyer: TS/JS developers building reliable AI backends.
- Deploy: SaaS (Inngest Cloud) + self-host option; AgentKit OSS.

## PRICING (inngest.com/pricing)
- Hobby: "$0/mo" — "50k /mo included" executions, "5" concurrency.
- Pro: "Starting at $99/mo" — "1m /mo included then $50 per 1m" executions, "100 included then $25 per 25" concurrency.
- Enterprise: custom.
- Trace retention: 24h (Hobby) / 7d (Pro) / 90d (Enterprise).

## Sources
- https://www.inngest.com/pricing (high)
- https://agentkit.inngest.com/ and .../advanced-patterns/human-in-the-loop (high)
- https://www.inngest.com/ai (high)

## Relevance to Hermes
NEAR-DIRECT-to-adjacent. Durable run plane + dashboard + HITL wait-for-event + multi-agent networks, transparent per-execution pricing. Developer/devops-first; legibility = traces. Human-first legible review surface still open.
