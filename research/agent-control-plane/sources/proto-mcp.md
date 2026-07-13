# MCP — Model Context Protocol

**Accessed:** 2026-07-13
**Confidence:** high on LF donation; med on exact steering-committee roster / adoption counts

## Sources
- MCP introduction — https://modelcontextprotocol.io/introduction
- Anthropic: "Donating the Model Context Protocol and establishing the Agentic AI Foundation" (Dec 9, 2025) — https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation

## What it standardizes
Open standard for connecting AI apps/models to external tools, data, and context (client↔server). NOT agent-to-agent messaging.
- "MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems."
- "Think of MCP like a USB-C port for AI applications."
- "MCP is an open protocol supported across a wide range of clients and servers. AI assistants like Claude and ChatGPT... all support MCP."

## Governance
- "Anthropic is donating the Model Context Protocol to the Linux Foundation's new Agentic AI Foundation."
- "The Agentic AI Foundation (AAIF) is a directed fund under the Linux Foundation co-founded by Anthropic, Block and OpenAI" "with support from Google, Microsoft, AWS, Cloudflare, and Bloomberg."
- Governance evolved: Anthropic-led → multi-vendor steering committee (GitHub/Microsoft joined at Build 2025) → LF/AAIF (Dec 2025).

## Adoption signal
- Anthropic Dec 2025: "more than 10,000 active public MCP servers"; "97M+ monthly SDK downloads." (Primary-adjacent, med.)
- Analyst/vendor figures (Stacklok 2026, registry counts) exist but treat as estimates.

## HELPS or HURTS an independent control plane?
**Mostly TAILWIND.** MCP standardizes the tool/context surface (not run/trace telemetry). An independent control plane can instrument at the MCP boundary — every tool call flows through a common protocol — to observe and gate agent actions regardless of model vendor. A shared choke point you can tap. Risk: co-governance by OpenAI/Google/Microsoft/AWS means labs can bundle native MCP-layer observability too. Enabling, not a moat by itself.
