# Temporal (temporal.io)

- **Accessed:** 2026-07-13
- **Type:** Primary (temporal.io, docs.temporal.io)
- **Confidence:** high

## What it is
Durable-execution engine (OSS) + Temporal Cloud (managed SaaS). General workflow orchestration, increasingly marketed for AI agents. Code-first, deterministic replay from event history.

## Hosted run control plane: YES (strongest for run observability)
- Temporal Web UI: "Inspect and troubleshoot an AI application's performance, inputs, and outputs from a detailed UI."
- Start / signal / query / terminate / reset runs are core APIs. Temporal Cloud is a fully managed control plane.

## HITL / approval gates: YES (first-class via Signals)
- "Easily facilitate human-in-the-loop interactions like validating LLM results or approving agent decisions." Workflows block/await indefinitely.

## Durable state & provenance: BEST-IN-CLASS
- Event-sourced history + deterministic replay. "Workflows automatically hold state over long periods of time (even years), so you don't need state machines."

## Multi-agent: via workflow composition (unopinionated). "Scale to millions of agents."

## Buyer / deploy
- Buyer: developers + platform/infra teams; broader than AI. Enterprise for mission-critical durability.
- Deploy: OSS self-host + Temporal Cloud (SaaS, consumption-based).

## PRICING (docs.temporal.io/cloud/pricing)
- Actions: "Actions pricing starts at $50 per million Actions ($0.00005 per Action)"; volume-tiered down ($45 / $40 / $35 / $30 / $25 at higher tiers).
- Storage: Retained "$0.00105" per GBh; Active "$0.042" per GBh.
- Plan floors: Essentials "Greater of $100/mo or 5% of Usage Spend"; Business "Greater of $500/mo or 10% of Usage Spend"; Enterprise/Mission Critical annual (contact sales).
- Action = "starting Workflows, recording a Heartbeat, or sending Signals."

## Sources
- https://docs.temporal.io/cloud/pricing (high)
- https://temporal.io/solutions/ai (high)
- https://docs.temporal.io/cloud/actions (high)

## Relevance to Hermes
NEAR-DIRECT on primitives (durable state, HITL signals, run inspection) but ADJACENT on persona/legibility: devops/infra-first, code-first, no human-narrative workspace. Temporal is the durability substrate a Hermes could sit ON, not a human-first legibility surface.
