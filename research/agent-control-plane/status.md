# Agent Control Plane — Market Research Status

**Branch:** `research/agent-control-plane`
**Started:** 2026-07-13
**Researcher:** Opus market-research agent
**Scope:** Reframed market for Hermes Canvas — not "generic AI canvases" but *agent run control planes / agent operations workspaces / human-in-the-loop agent observability / durable agent state & provenance / coding-agent run dashboards / multi-agent orchestration & control / task-cron-tool-deployment observability.*

**Do-not-touch:** No app code changes. No interference with Wave 1. Artifacts committed locally, not pushed.

---

## Deliverables

- [x] `status.md` — this file (methodology, confidence rules, progress)
- [x] `catalog.md` — per-vendor rows across 7 segments: category, what it is, buyer, HITL/provenance/coding-agent coverage, pricing, evidence, confidence
- [x] `landscape.md` — the seven segments, direct vs near-direct competitor count, feature/buyer matrix, saturated vs whitespace map
- [x] `observations.md` — answers to the 7 commissioned questions + 5 falsifiable hypotheses + "what we do not know"
- [x] `sources/*.md` — 96 primary source captures (URL, accessed date, quote, confidence)

## Status: COMPLETE (2026-07-13)

All four artifacts written; 96 source captures under `sources/` (obs 7 / orch 17 / code 20 / hitl 13 / dur 14 / lab 9 / proto 4 / signal 12). Committed locally, not pushed.

### Method note
Research ran as a 7-segment parallel fan-out; several segment agents further delegated per-vendor teardowns (New Relic, Datadog, AWS AgentCore, Azure Foundry, Google Vertex, DBOS, Burr, LangSmith/Arize, etc.), all grounded in official docs/pricing pages with anecdote labeled separately.

### Headline findings (see observations.md for the full answers)
1. **~60 relevant products; zero match the full Hermes shape.** Truest single competitor = LangChain Agent Inbox (framework-locked, debug-flavored). ~6–8 partial-direct, ~20–25 near-direct, 30+ adjacent.
2. **Saturated:** trace ingestion/display, durable-execution substrate, single-vendor coding runners, offline eval, HITL-as-a-node, "control plane" fleet-governance branding.
3. **Whitespace:** human-first legibility of an individual run · live control as an *experience* · provenance-as-diffable-artifact · evidence/receipts fused with run state · vendor-neutrality · operator/reviewer persona + per-seat pricing · non-coding/cross-org ops.
4. **Hermes-first→adapters is viable** on protocol tailwinds (MCP/A2A/OTel-GenAI/AG-UI) + labs' framework-lock weakness — *if* the moat is the layer above the adapter. ⚠︎ "OpenClaw" could not be identified as any public product.
5. **Pricing hypothesis:** seat-led (price the operator ~$20–40/seat, meter compute lightly); hosted managed execution is a cost-plus add-on, never the headline (compute is a commodity the labs drive to zero).
6. **Bundling risk:** already shipping for commodity layers (GitHub Agent HQ is the biggest threat, but coding/GitHub-scoped); structurally low for neutral cross-vendor HITL control — and OpenAI/Anthropic are actively ceding that surface. ~12–24 mo window.
7. **Candid gaps:** no credible TAM found (not fabricated); core "do humans read the diffs" bet still unproven; willingness-to-pay untested.

---

## Methodology & evidence rules

- **Primary vs anecdote separated.** Official docs / pricing / product pages = primary. HN/Reddit/X/YouTube/forums = anecdote, labeled as such and never promoted to fact by repetition.
- **Confidence scale:** `high` (multiple independent primary sources or vendor's own authoritative doc), `med` (single primary source or corroborated anecdote), `low` (single anecdote / inference / undated).
- **Every claim carries:** source link, accessed date (2026-07-13 unless noted), confidence.
- **No fabricated market figures.** No TAM/SAM invented. Funding/pricing only when a real source is cited; otherwise flagged unknown.
- **Vendor bias discount.** Vendor self-description of differentiation is directional, not fact. Independent teardown/anecdote weighted higher for "does it actually work / who actually buys."
- **Pricing volatility.** The 2024–2026 agent-infra market re-priced repeatedly; every dollar figure carries a "re-verify at commitment" flag.

## Commissioned questions (answered in observations.md)
1. How many direct / near-direct competitors exist today?
2. Feature and buyer matrix.
3. Saturated vs open whitespace.
4. Is Hermes-first, then adapters (e.g. OpenClaw), viable?
5. Pricing hypothesis: hosted managed-agent execution vs BYOK.
6. Risk of frontier labs bundling the category.
7. 3–5 falsifiable customer/value hypotheses.
