# Galileo — Agent Control (open-source control plane)

- **Title:** Announcing Agent Control: The Open Source Control Plane for AI Agents
- **URL:** https://galileo.ai/blog/announcing-agent-control
- **Accessed:** 2026-07-13
- **Type:** Primary (vendor blog / announcement, 2026-03-11); corroborated by GlobeNewswire release & The New Stack
- **Confidence:** high (feature framing); pricing of hosted Galileo not on this page

## What it is
An open-source runtime *governance* control plane for AI agents — step-level policy enforcement across any framework, managed from one place, updatable without touching agent code. Apache 2.0.

## Verbatim quotes
- "Agent Control is a control plane that establishes a new standard for governing agent behavior."
- "The system evaluates the input or output against the active policy and returns a decision: deny, steer, warn, log, or allow."
- "A single policy can combine Galileo's Luna for toxicity detection, NVIDIA NeMo for topic guardrailing, AWS Bedrock for compliance checks, simple regex for PII patterns, and your own custom evaluator"
- @control() decorator: "hooks can be placed at every meaningful step. An agent that chains together six internal functions can have six independently governed control points"
- "open source because runtime governance for AI agents should be infrastructure, not a product moat"
- "Released under the Apache 2.0 license"

## Relevance to Hermes
Adjacent-to-near-direct. This is a *guardrail/policy* control plane (deny/steer/warn) — real-time enforcement, not a human-legibility run workspace. The "control point at every step" concept parallels Hermes approval gates, but Galileo's decision-maker is a policy/evaluator, not a human reviewer looking at a legible run. Galileo's core commercial product is agent observability/evals; Agent Control is the OSS enforcement layer.

## Deployment / buyer / pricing
- Deploy: OSS (Apache 2.0), self-host; Galileo also sells a hosted observability/eval platform.
- Buyer: enterprise AI platform / trust & safety teams.
- Pricing: Agent Control is free/OSS; hosted Galileo pricing not on this page (contact sales / usage tiers elsewhere).
