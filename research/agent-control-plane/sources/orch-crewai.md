# CrewAI + CrewAI AMP / Enterprise

- **Accessed:** 2026-07-13
- **Type:** Primary (crewai.com, docs.crewai.com) + labeled anecdote for pricing
- **Confidence:** high (product), medium/low (pricing above Free)

## What it is
- **CrewAI** = OSS multi-agent framework ("crews" of role-based agents). "The open platform that accelerates agent adoption."
- **CrewAI AMP (Agent Management Platform) / Enterprise** = managed platform extending the OSS framework for running agent workflows at scale.

## Hosted run control plane: YES
- "Deploy your crews to a managed infrastructure with a few clicks." Deploy via GitHub / Crew Studio (no-code) / CLI.
- Dashboard + REST API + webhooks: "Stream real-time events and updates to your systems."
- Observability: "Monitor your crews with detailed execution traces and logs."
- Granular attach/resume/stop primitives not spelled out in captured docs.

## HITL / approval gates: PARTIAL
- OSS framework supports human input steps; AMP/Enterprise intro page did not surface explicit approval-gate/inbox features. Not clearly a hosted control-plane feature.

## Durable state & provenance: PARTIAL
- Execution traces and logs present; explicit checkpointing / time-travel / thread persistence not documented (lower confidence).

## Multi-agent: YES (core identity — crews + flows).

## Buyer / deploy
- Buyer: developers (framework/CLI) + no-code builders (Crew Studio) + enterprise ("Used by 63% of the Fortune 500").
- Deploy: SaaS managed AMP + OSS framework + private/self-host at Enterprise ("CrewAI or private infrastructure").

## PRICING
- Official (crewai.com/pricing) — only two tiers rendered:
  - Basic: "Free" — "50 workflow executions/month", visual editor + AI copilot, GitHub integration.
  - Enterprise: "Custom" — "50 hours of development/month", "CrewAI or private infrastructure", on-site support, SAML/FedRAMP High/SSO.
  - No mid-tier dollar figure publicly listed on official page.
- **ANECDOTE (non-official, low confidence):** third-party review sites cite Professional ~$25/mo (100 exec/mo) and Enterprise ~$60k–$120k/yr. NOT on official page; varies by source.

## Sources
- https://www.crewai.com/ (high) — "The open platform that accelerates agent adoption."; "Used by 63% of the Fortune 500."
- https://docs.crewai.com/en/enterprise/introduction (high) — "Deploy your crews to a managed infrastructure with a few clicks."; "Monitor your crews with detailed execution traces and logs."
- https://www.crewai.com/pricing (medium)
- ANECDOTE: https://www.zenml.io/blog/crewai-pricing (low); https://techjacksolutions.com/ai-tools/crewai/crewai-pricing/ (low)

## Relevance to Hermes
ADJACENT-to-near-direct. Strong multi-agent + hosted deploy, but thin documented provenance/time-travel and no clear human-first approval workspace. Legibility/HITL is where Hermes differentiates.
