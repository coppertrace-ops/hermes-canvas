# Agent provenance / tamper-evident audit trails (emerging)

- URLs: https://www.kiteworks.com/regulatory-compliance/ai-agent-audit-trail-siem-integration/ , https://www.tierzero.ai/blog/ai-agent-audit-trail/ , https://arxiv.org/html/2604.05485 (Auditable Agents) , arxiv 2606.04990 (Evidence Tracing/Execution Provenance survey)
- Accessed: 2026-07-13
- Confidence: Medium (mix of vendor blogs + arXiv; category is early/fragmented)

## What's happening
An emerging "Know Your Agent (KYA)" + audit-trail category. "An AI agent audit trail is a chronological, tamper-evident record of all agent activities, with the record cryptographically sealed so any post-hoc modification is detectable." Frameworks "tie every decision from plan formation to tool invocation to a verifiable chain of evidence ... moving beyond mutable execution logs toward cryptographically anchored, tamper-evident provenance."

## Provenance vs agent self-report (core to Hermes)
Explicit thesis matching Hermes: move from the agent's mutable self-report to independent, cryptographically anchored records. TierZero framing: "Your AI Agents Are Changing State. There's No Audit Trail."

## Regulatory driver
"The EU AI Act reaches full enforcement on August 2, 2026 ... The 72-hour incident reporting window means you need to reconstruct exactly what an agent did and why within three days."

## Maturity
Mostly whitepapers, SIEM-integration plays, and identity/KYA vendors — NOT yet a polished human-legible agent-run product. Whitespace for a legible, server-verified agent run/provenance workspace.

## Buyer
Security/compliance/GRC + platform teams. Confidence Medium (nascent).
