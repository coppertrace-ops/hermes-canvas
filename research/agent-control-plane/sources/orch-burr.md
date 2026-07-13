# Burr (DAGWorks / Apache Burr incubating)

- **Accessed:** 2026-07-13
- **Type:** Primary (burr.apache.org, github.com/DAGWorks-Inc/burr, blog.dagworks.io)
- **Confidence:** high

## What it is
OSS Python framework for stateful decision-making apps (chatbots, agents, simulations) modeled as state machines. Now "Apache Burr (Incubating)." Ships a local UI for monitoring/tracing/debugging.

## Hosted run control plane: PARTIAL (self-hosted UI, not managed SaaS)
- "enables developers to model applications as state machines, providing a user interface for real-time monitoring, tracing, and debugging."
- "Burr comes with a user-interface that enables monitoring/telemetry, as well as hooks to persist state/execute arbitrary code during execution."
- Time-travel ("Travel Back in Time with Burr"). But this is a local/self-run UI, not a managed hosted control plane.

## HITL / approval gates: YES (framework-level)
- "It allows users to pause execution and wait for human input at any step, perfect for approval workflows and interactive agents."

## Durable state & provenance: YES
- Pluggable persisters to save/load application state; telemetry for state-related debugging.

## Multi-agent: YES ("Parallel Multi Agent Workflows with Burr").

## Buyer / deploy
- Buyer: Python developers building stateful/agentic apps.
- Deploy: OSS self-host; local UI. No managed SaaS run plane (DAGWorks' commercial focus was Hamilton/observability).

## PRICING
- OSS, free (Apache). No public hosted-plane pricing (not publicly listed).

## Sources
- https://burr.apache.org/ (high)
- https://github.com/DAGWorks-Inc/burr/blob/main/README.md (high)
- https://blog.dagworks.io/p/building-interactive-agents-with (high, HITL/pause)
- https://blog.dagworks.io/p/travel-back-in-time-with-burr (high, time-travel)

## Relevance to Hermes
NEAR-DIRECT in spirit (state machine + UI + pause-for-human + time-travel = legibility-ish), but it's an OSS developer library with a local debug UI, not a hosted human-first control plane. Closest OSS conceptual cousin to Hermes' legibility angle; validates the pattern, leaves the hosted-human-first surface open.
