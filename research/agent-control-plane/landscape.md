# Agent Control Plane — Landscape

Companion to [[catalog]] (vendor rows + evidence) and [[observations]] (commissioned answers). Accessed 2026-07-13. This document maps the seven segments, counts competitors against the **Hermes shape**, gives feature/buyer matrices, and marks saturated vs open ground.

## The Hermes shape (the yardstick)

Hermes Canvas post-MVP is a **human-first, server-authoritative operations workspace for an agent** that answers one question — *what is the agent doing, what changed, what evidence proves it, and what needs human input?* — and lets a human act on it. Concretely, six pillars:

1. **P1 Legible run state** — live run as a first-class, resumable object rendered as human narrative, not a trace-debug waterfall or a scraped terminal.
2. **P2 Live in-the-loop control** — approve/reject/stop/resume/redirect a *running* agent as an *experience*, not just a wait-for-event mechanism.
3. **P3 Provenance-as-artifact** — append-only, server-verified, diffable versioned artifacts ("what changed since you last looked"), independent of the agent's self-report.
4. **P4 Evidence & receipts** — tests, builds, deploy links, delivery confirmation surfaced as ground-truth data, not prose the agent wrote about itself.
5. **P5 Vendor-neutral / cross-agent** — Hermes-first, then adapters (e.g. OpenClaw) over any compatible agent; not locked to one framework or one lab's models.
6. **P6 Operator/reviewer persona** — built for the human who *runs and reviews* agents, priced per human seat — not only the engineer who *authored* the workflow.

No product found satisfies all six. The competitor landscape is best understood as **everyone owning 1–3 pillars and calling it a "control plane."**

---

## 1. How many direct / near-direct competitors exist today?

**Full-shape (all six pillars): effectively zero.** Nothing found combines P1–P6.

**Direct (partial-overlap): ~6–8 products, each missing ≥2 pillars.** These compete for the same "human reviews/steers a legible agent run" job but are framework-locked, coding-scoped, offline, or thin on provenance:

| Direct competitor | Owns | Missing | Fatal gap vs Hermes |
|---|---|---|---|
| LangChain **Agent Inbox** (+LangSmith/LangGraph Platform) | P1,P2 | P3,P5,P6 | framework-locked to LangGraph; debug-flavored; no artifact/diff |
| **HumanLayer** (+ACP) | P2 | P1,P3,P4 | approvals-API only; drifting into a coding IDE, vacating the pure-HITL ground |
| **Maxim AI** | P6, partial P2 | P1(live),P2(live),P3 | human review is *offline* queues, no live gate, no run state |
| **GitHub Agent HQ** | P1,P2,P4(git) | P3(artifact),P5(non-GitHub),P6 | coding/SWE + GitHub-scoped; walled inside paid Copilot |
| **Sculptor** (Imbue) | P1(structured),P2(takeover) | P4,P5,P6 | local/coding-only; single-machine; thin provenance |
| **omnara** | P2(remote) | P1(deep),P3,P4 | thin legibility; coding-agent wrapper; original repo archived Feb'26 |
| **Conductor** / **Vibe Kanban** | P1(tiled),P2 | P3,P4,P5,P6 | tile-and-scrape terminals; Vibe Kanban sunsetting |

**Near-direct: ~20–25 products** — they have a run plane and HITL primitives (or a rich human/provenance layer) but sit one layer down (durable-execution substrate) or one persona over (developer/enterprise-IT), and are not human-first legibility products: Temporal, Orkes Conductor, Inngest AgentKit, Vercel Workflow, Restate, DBOS, Trigger.dev, Convex, Hatchet, Restack, Azure Foundry Agent Service, HoneyHive, Comet Opik, Galileo, Braintrust, W&B Weave, Burr, UiPath Maestro, ServiceNow AI Control Tower, Salesforce Command Center, Devin, Cursor Background Agents, OpenAI Codex cloud, Google Jules, Factory.ai.

**Adjacent: 30+** — trace/eval infrastructure (Langfuse, Arize AX/Phoenix, Datadog, New Relic, Traceloop, Langtrace, AgentOps), gateways (Portkey, LiteLLM, Kong, Cloudflare/Vercel AI Gateway, TrueFoundry), cron/receipt monitors (Cronitor, Healthchecks), lineage (OpenLineage/Marquez), memory stores (Letta/Zep/mem0), business-user builders (Lindy, Relay, Gumloop), CX supervision (Sierra, Decagon), fleet-governance planes (OpenHands, Fiddler, Microsoft Agent 365).

**Headline:** ~60 relevant products across the seven segments, but **the count that matters is that the number satisfying the full Hermes shape is zero, and the truest single competitor — LangChain Agent Inbox — is framework-locked and debug-flavored.** The field is crowded one layer below and one job over; the human-first, cross-agent, artifact-provenance center is unoccupied. (See §4 map.)

---

## 2. Feature & buyer matrix

### 2a. Feature coverage by segment (● strong · ◐ partial · ○ absent)

| Segment | P1 legible state | P2 live control | P3 provenance-artifact | P4 evidence/receipts | P5 vendor-neutral | P6 operator persona |
|---|---|---|---|---|---|---|
| 1 Observability/tracing | ◐ (trace views) | ○ | ○ (trace lineage only) | ◐ (eval scores) | ● (OTel) | ○ (AI/ML eng) |
| 2 Orchestration/control planes | ◐ (run UI) | ◐ (mechanism; Inbox=●) | ◐ (event history for replay) | ○ | ◐ | ○ (builder) |
| 3 Coding-agent dashboards | ◐ (PR/terminal) | ● | ◐ (git-shaped) | ◐ (tests; deploy ○) | ◐ (GitHub HQ only) | ◐ |
| 4 HITL/supervision | ○ | ● | ○ | ○ | ○ | ◐ (biz towers) |
| 5 Durable exec / provenance | ◐ (debug UI) | ◐ (signals) | ● (append-only truth) | ◐ (receipts in cron niche) | ◐ | ○ (author) |
| 6 Frontier-lab platforms | ● (native) | ◐ | ◐ (audit logs) | ◐ | ○ (mostly locked) | ◐ (Agentspace/365) |

**Read:** every pillar is covered *somewhere* strongly, but no *column-complete* row and, more tellingly, **no product with ● in P1+P2+P3 simultaneously.** P3-as-legible-artifact (vs audit log) and P6 (operator persona + seat pricing) are the weakest columns across the whole field.

### 2b. Buyer matrix

| Buyer persona | Who serves them today | Budget line | Willingness-to-pay anchor | Hermes fit |
|---|---|---|---|---|
| **AI/ML & platform engineer** (build+debug agents) | LangSmith, Langfuse, Arize, Datadog, Weave, Temporal, Inngest | Observability / infra | $19–249/mo self-serve; $99–500/mo infra; $39–60/seat | Crowded; not Hermes' wedge |
| **Enterprise IT / risk / GRC** (govern agent fleets) | ServiceNow, Salesforce, UiPath, Microsoft Agent 365, OpenHands, Fiddler | Governance / compliance | contact-sales, $$$$ | Adjacent; regulation tailwind (EU AI Act Aug'26) but heavy sale |
| **Developer running coding agents** (Frank's own case) | GitHub Agent HQ, Cursor, Devin, Codex, Claude Code, Conductor, Vibe Kanban, Sculptor | Dev tools / seat | $20–200/mo per dev; API + spend limit | **Hermes' beachhead** — legibility+neutrality gap |
| **Operator / reviewer** (runs & approves agent work, not the author) | *almost nobody* (Maxim courts PMs; HoneyHive SMEs) | — (untapped) | unpriced today | **Whitespace persona** — P6 |
| **Business-user / ops** (approve steps in a workflow) | Lindy, Relay, Gumloop, n8n | Automation SaaS | $19–100/mo | Wrong persona for Hermes |

**Key buyer insight:** the money today flows to *engineer* (observability/infra) and *enterprise-IT* (governance) budgets. The **operator/reviewer seat is a real persona nobody prices for** — every incumbent meters compute (vCPU-hr, actions, spans, checkpoints), and only LangSmith ($39), Restack ($25), Maxim ($29–49) and HumanLayer ($100) even have a *seat* concept, all builder-seats. That pricing/persona gap is as much whitespace as any feature.

---

## 3. Saturated vs open whitespace

### Saturated (do not compete here — race to the bottom or against giants)

- **S1 · Trace ingestion & display.** 16+ obs products, OTel/OpenInference-standardized, many free/OSS. "Agent-aware traces" is table-stakes marketing. Commoditizing.
- **S2 · Durable-execution substrate.** Temporal/Restate/DBOS/Inngest/Trigger/Hatchet + all three hyperscalers. Append-only history + replay is a commodity; pricing converged to ~$0.05/M-actions or ~$0.085–0.099/vCPU-hr. Build *on* it, don't rebuild it.
- **S3 · Single-vendor coding-agent runners.** Devin/Codex/Cursor/Jules/Claude Code each ship a parallel-task surface. Bundled, model-locked, distribution-led.
- **S4 · Offline eval & annotation.** Every obs/eval tool does LLM-judge + human labeling of finished runs.
- **S5 · HITL as an approval *node*.** Every workflow builder (n8n, Relay, Lindy, Gumloop, Vellum) ships one. Commodity mechanism.
- **S6 · "Agent control plane" as fleet governance branding.** Microsoft Agent 365, OpenHands, Galileo Agent Control, Fiddler, Kore.ai, "Agent Control Fabric." The *phrase* is contested and being claimed for identity/policy/cost — a different job than Hermes.

### Open whitespace (defensible ground)

- **W1 · Human-first legibility of an individual run** (P1). Everyone renders traces for the *author debugging a failure*. Nobody renders *what the agent is doing and why* as a narrative a non-author can read and steer. HN practitioners explicitly say tools "record what happened… but not why the agent deviated from the plan." (anecdote, `signal-hn-monitoring-agents`)
- **W2 · Live in-the-loop control as an experience** (P2). HITL exists everywhere as a *mechanism* (Signals/interrupts/waitForEvent/requires_action) but only LangChain Agent Inbox is a real human *surface* — and it's framework-locked. Fusing gate + run-state + what-changed + lifecycle control in one view is unoccupied by any monetized product.
- **W3 · Provenance-as-legible-artifact** (P3). Provenance today = trace lineage (debug) or audit log (compliance). Nobody treats each agent output as an append-only, **diffable, reviewable versioned artifact** — exactly Hermes' Chronicle/diff direction. Tamper-evident agent provenance (KYA) has the thesis but no product-grade legible UI.
- **W4 · Evidence & delivery receipts fused with run state** (P4). Deploy-link provenance is essentially unoccupied across the entire coding-agent field. Receipt-grade "did it actually run/land" confirmation lives only in the content-blind cron-monitor niche (Cronitor/Healthchecks). Nobody merges external receipts with rich agent run state.
- **W5 · Vendor-neutral cross-agent workspace** (P5). GitHub Agent HQ is the only cross-vendor player and it's coding/GitHub-scoped. No lab will build a neutral surface for competitors' agents (structural conflict). Protocol standardization (MCP/A2A/OTel-GenAI/AG-UI) makes neutrality *buildable* now.
- **W6 · The operator/reviewer persona + per-seat pricing** (P6). Untapped budget; incumbents meter compute, not humans.
- **W7 · Non-coding / cross-org agent operations.** Agent HQ is SWE-scoped; "operate any agent run" (research, cron, delivery, tool/deployment actions — Hermes' actual surface list) is open.

### The map

```
                        HUMAN-FIRST / LEGIBLE ────────────► DEVOPS / DEBUG-FIRST
     CROSS-VENDOR   ┌─────────────────────────────┬──────────────────────────────┐
         │         │   ★ HERMES WHITESPACE ★      │  OTel GenAI, Datadog,          │
         │         │   (W1–W7: legible run +      │  New Relic, AGNTCY             │
         ▼         │    live control + artifact   │  (neutral but trace-only)      │
                   │    provenance, any agent)    │                               │
                   │   nearest: (none full)       │                               │
                   ├─────────────────────────────┼──────────────────────────────┤
     SINGLE-VENDOR │  GitHub Agent HQ (coding),   │  Temporal, DBOS, Inngest,      │
     / LOCKED      │  Agent Inbox (LangGraph),    │  Vercel/CF Workflows, Orkes,   │
                   │  Sculptor/omnara/Conductor   │  AgentCore/Foundry/Vertex,     │
                   │  (coding, local),            │  LangSmith/Arize/Weave         │
                   │  Maxim (offline HITL)        │  (author-facing plumbing)      │
                   └─────────────────────────────┴──────────────────────────────┘
```

The top-left quadrant — **human-first legibility over any agent** — has no full occupant. The nearest neighbors each fail on neutrality (Agent Inbox, GitHub HQ, Sculptor), on live control (Maxim, all of obs), or on legibility depth (omnara, Conductor). The clock: GitHub is occupying the coding corner and governance-plane players (Microsoft Agent 365) will reach down. Estimated window before the neutral/cross-org/non-coding wedge is contested: ~12–24 months.

---

## 4. Cross-cutting signals (dated, confidence-tagged)

- **Bundling is shipping now, not future** (H). Google/Microsoft/GitHub all ship native run dashboards + traces + HITL + provenance on OTel today. `lab-*` captures.
- **But two of four labs are retreating from the surface** (H): OpenAI sunsets visual Agent Builder + native Evals Nov 30 2026 (points to third-party Promptfoo); Anthropic ships Agent SDK as explicit "bring your own observability" + build-your-own approval UI. `lab-openai-agentkit`, `lab-anthropic-agent-sdk`.
- **Demand is real but partly satisfied by roll-your-own** (M-H primary / anecdote): LangChain State-of-Agent-Engineering survey n=1,340 — 89% have observability, human review 59.8% "essential"; but experienced HN engineers say "the same OTEL & LGTM stack I use for everything." `signal-langchain-state-of-agents`, `signal-hn-monitoring-agents`.
- **Category consolidating** (M): reported Galileo→Cisco (Apr'26, unconfirmed); Cognition←Windsurf (Jul'25); indie coding cluster attriting (Terragon shut Jan'26, Vibe Kanban sunsetting, Crystal deprecated, omnara repo archived). Thin wrappers don't retain; durable run-state + provenance is where defensibility lives.
- **Regulation forcing function** (M): EU AI Act full enforcement Aug 2 2026 + 72-hr incident reconstruction — a tailwind for tamper-evident, server-verified provenance. `dur-agent-provenance-audit`.
- **No credible analyst TAM** for "AgentOps"/"agent observability" was found in a citable source. Not fabricated. See [[observations]] "what we do not know."
