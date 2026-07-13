# A2A — Agent2Agent Protocol (+ IBM ACP merger)

**Accessed:** 2026-07-13
**Confidence:** high (Linux Foundation press)

## Sources
- LF: "Linux Foundation Launches the Agent2Agent Protocol Project" (Jun 23, 2025) — https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents
- LF: "A2A Protocol Surpasses 150 Organizations..." (~Apr 2026) — https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year
- LF AI & Data: "ACP Joins Forces with A2A" (Aug 29, 2025) — https://lfaidata.foundation/communityblog/2025/08/29/acp-joins-forces-with-a2a-under-the-linux-foundations-lf-ai-data/

## What it standardizes
Agent-to-agent communication/collaboration across vendors/frameworks; agents discover each other via **Agent Cards**.
- "A2A enables autonomous agents to discover one another, exchange information securely and collaborate across systems."

## Governance / backing
- Google originated it (April 2025), donated spec+SDKs to Linux Foundation.
- Founding partners: Google, AWS, Cisco, Salesforce, SAP, Microsoft, ServiceNow.

## Adoption signal
- "surpasses 150 organizations," "lands in major cloud platforms," "enterprise production use in first year" (grew from 50+ to 150+ orgs by ~Apr 2026).

## IBM ACP merged in
- "IBM Research launched the Agent Communication Protocol (ACP) in March 2025 to power its BeeAI Platform." "ACP is officially merging with the A2A under the Linux Foundation umbrella." (Consolidation → one surviving agent-comms standard.)
- NOTE naming: IBM's Agent Communication Protocol (merged into A2A) ≠ Cisco/AGNTCY's Agent Connect Protocol (separate).

## HELPS or HURTS?
**TAILWIND for cross-agent scope, neutral on telemetry.** Standard wire + Agent Cards let an independent control plane observe/mediate agent-to-agent interactions with one schema, reducing the N×N adapter problem. Doesn't define run/trace observability → complementary. Broad multi-lab backing makes it durable to build on.
