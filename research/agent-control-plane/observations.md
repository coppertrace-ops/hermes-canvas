# Agent Control Plane — Observations & Answers

Answers to the seven commissioned questions, then falsifiable hypotheses and a candid "what we do not know." Evidence lives in [[catalog]]; the map and matrices in [[landscape]]. Accessed 2026-07-13. Confidence tags per [[status]]. **No market figures are fabricated.**

The yardstick is the **Hermes shape** (six pillars, defined in [[landscape]] §Hermes shape): P1 legible run state · P2 live in-the-loop control · P3 provenance-as-artifact · P4 evidence/receipts · P5 vendor-neutral/cross-agent · P6 operator persona.

---

## Q1 — How many direct / near-direct competitors exist today?

**Full-shape (all six pillars): zero** (H). Nothing found combines legible run state + live control + artifact-provenance + evidence/receipts + vendor-neutrality + operator persona.

**Direct (partial-overlap, each missing ≥2 pillars): ~6–8** (H) — LangChain Agent Inbox (truest, framework-locked), HumanLayer, Maxim AI, GitHub Agent HQ, Sculptor, omnara, Conductor/Vibe Kanban. Table in [[landscape]] §1.

**Near-direct: ~20–25** (H) — durable-execution + orchestration substrates one layer down (Temporal, Orkes, Inngest, Vercel Workflow, DBOS, Trigger.dev, Convex, Restack, Azure Foundry) and coding-agent runners / eval-rich obs one persona over (Devin, Cursor, Codex, Jules, Factory; HoneyHive, Opik, Galileo, Braintrust, Weave; UiPath Maestro, ServiceNow, Salesforce).

**Adjacent: 30+** — trace/eval infra, gateways, cron/receipt monitors, lineage, memory stores, business-user builders, CX supervision, fleet-governance planes.

**Bottom line:** ~60 relevant products, but the number matching the full Hermes shape is **zero**, and the single truest competitor (Agent Inbox) is framework-locked to LangGraph and debug-flavored. The field is dense one layer below and one job over; the human-first, cross-agent, artifact-provenance center is unoccupied.

---

## Q2 — Feature & buyer matrix

Full matrices in [[landscape]] §2. Compressed:

**Features:** every pillar is strongly covered *somewhere*, but there is **no column-complete product and none with ● in P1+P2+P3 at once**. Weakest columns field-wide: **P3 provenance-as-legible-artifact** (everyone does trace-lineage/audit-log, nobody does diffable versioned artifacts) and **P6 operator persona / seat pricing**.

**Buyers:** money flows to two budgets today — *AI/ML & platform engineer* (observability/infra: $19–249/mo self-serve, $99–500/mo infra, $39–60/seat) and *enterprise IT/risk/GRC* (governance, contact-sales). Two personas are underserved: the **developer running coding agents** (Hermes' beachhead — served narrowly by GitHub/Cursor/Devin but with the legibility+neutrality gap) and the **operator/reviewer** who runs & approves agent work but doesn't author it (**priced by nobody** — all metering is compute-centric).

---

## Q3 — Saturated vs open whitespace

Full detail in [[landscape]] §3. Summary:

**Saturated (avoid):** trace ingestion/display (S1); durable-execution substrate (S2); single-vendor coding-agent runners (S3); offline eval/annotation (S4); HITL-as-a-node (S5); "agent control plane" *as fleet-governance branding* (S6).

**Open whitespace (defensible):** human-first legibility of an individual run (W1); live in-the-loop control as an *experience* (W2); provenance-as-legible-artifact (W3); evidence & delivery receipts fused with run state (W4); vendor-neutral cross-agent workspace (W5); operator/reviewer persona + per-seat pricing (W6); non-coding / cross-org agent operations (W7).

The through-line: **the industry has solved agent-run truth as plumbing and agent-run debugging as tooling; nobody has solved agent-run *legibility and control for a human who isn't the author.***

---

## Q4 — Is Hermes-first, then adapters (e.g. OpenClaw), viable?

**Yes — evidence-supported, with three conditions and one flagged unknown.** (Confidence: M-H on the strategic logic; the specific "OpenClaw" target is unverified — see caveat.)

**Why it's viable:**

1. **Protocol standardization is a real tailwind that de-risks adapters** (H). MCP (tool calls), A2A (agent-to-agent), OTel-GenAI semconv (traces/spans vocab: `invoke_agent`/`execute_tool`/`plan`), and AG-UI (agent→frontend event stream: `TOOL_CALL`/`STATE_DELTA`/lifecycle) are all now under neutral foundations (Linux Foundation / LF Agentic AI Foundation) with multi-lab backing. A normalized event/run schema is exactly what an adapter needs. Building the second, third, Nth adapter gets cheaper as these mature. (`proto-*`)
2. **Incumbents' framework-lock is their structural weakness** (H). Agent Inbox = LangGraph-only; GitHub Agent HQ = GitHub-only; every lab console is model-locked. **No frontier lab will build a neutral control surface for competitors' agents.** Neutrality is a position only an independent can hold — and it is now *buildable* because of (1).
3. **Depth-first beats breadth-first here** (M-H, supported by attrition evidence). The indie coding cluster that shipped thin "tile my worktrees" wrappers is attriting fast (Terragon shut down, Vibe Kanban sunsetting, Crystal deprecated, omnara archived). Thin wrappers don't retain. Building *deep* legibility/control/provenance on one agent (Hermes) first is how you earn the artifact-diff + provenance depth that a wrapper can't — then generalize via adapters. This matches the repo's own architecture direction (append-only version chain, semantic diff, server-verified provenance).

**Three conditions:**

- **C1 — The moat must be the layer above the adapter, not the adapter.** Since (1) makes "ingest & display an agent's events" trend to commodity, the defensible value must be P1+P2+P3 (legible run state + live control + artifact-provenance), not the connector count.
- **C2 — Adapters must normalize to Hermes' own event/artifact/provenance model** (the repo already has the versioned Canvas API + append-only version chain to normalize *into*). An adapter that just proxies a vendor's trace stream inherits the vendor's debug-first legibility and loses the wedge.
- **C3 — Sequence matters.** Ship Hermes-first depth, prove the legibility/control value on the one agent Frank actually runs, *then* add the second adapter only when a concrete second agent exists to pull it. Adapter-count is a distraction until the core is proven (mirrors the MVP discipline in `docs/implementation-options.md`).

**Caveat (flagged unknown):** I could **not find any public product or project named "OpenClaw"** in this research pass. It appears to be an internal/hypothetical adapter target (or a codename), not a known external agent. The viability argument above holds for *"a compatible second agent"* generically; whether OpenClaw specifically is a good first adapter target cannot be assessed without knowing what it is. Recorded in "what we do not know."

---

## Q5 — Pricing hypothesis: hosted managed-agent execution vs BYOK

**Hypothesis (two-part, seat-led): price the human, meter the machine lightly — and do NOT lead with hosted compute.** (Confidence: M — anchored in real competitor prices, but willingness-to-pay for *this specific* product is untested.)

**Evidence anchors (all H unless noted):**
- Hosted managed-agent **compute has converged** to ~$0.085–0.099/vCPU-hr + ~$0.009–0.0095/GB-hr across AWS AgentCore ($0.0895), Google Vertex ($0.085), Azure Foundry (~$0.099⚠︎). This is a **commoditized, thin-margin substrate the labs/hyperscalers will drive toward zero.**
- Durable-run infra mid-tier clusters at **$99–$500/mo** (Temporal $100/$500, DBOS $99/$499, Inngest $99, Trigger $50) — proven infra-buyer willingness-to-pay.
- Obs/eval self-serve: **$19–$249/mo**; seat-based **$39–$60/seat** (LangSmith $39, Weave $60, Maxim $29–49).
- HITL/supervision seats: **HumanLayer $100/user/mo, Restack $25/user, LangSmith $39/seat** — the only seat anchors, all builder-seats.
- Coding-agent hosted: Devin $20→$200 (+ACU ~$2.25⚠︎); Cursor/Codex API-metered + spend limit; Claude Code web bundled into existing Max/API limits.

**The hypothesis:**

- **Tier A — BYOK / bring-your-own-agent (the beachhead, and Frank's own case).** Price **per operator/reviewer seat (~$20–40/seat/mo)** + light run metering (per-run or per-active-hour, small). The user brings their own Claude Max/API key and their own compute; Hermes' value is **legibility + control + provenance**, not execution. This targets the untapped *operator-seat* budget nobody prices for, and it's honest: you're not reselling compute the labs give away.
- **Tier B — Hosted managed execution (only once pulled).** Offer managed run-hours as **cost-plus pass-through on the ~$0.09/vCPU-hr-equivalent substrate + a margin**, or bundled run-hours inside a higher plan — *plus the seat*. Managed execution is a convenience add-on, not the headline. Leading with it means competing with hyperscalers on a commodity at their cost floor.
- **Enterprise — seat + governance + retention** (SSO, audit export, longer provenance retention), contact-sales, aligned to the GRC budget the EU AI Act is activating.

**Why seat-led:** the compute layer is a race to zero the labs win; the **human-review seat is an uncontested budget** and matches the P6 whitespace. The risk to test (see H4 below): whether operators will pay a *seat* for legibility when engineers are used to metered/free observability.

---

## Q6 — Risk of frontier labs bundling the category

**Candid assessment: bundling is already shipping and is a serious risk for the commodity layers — but structurally low for the defensible core.** (Confidence: H on what's shipped; M on timeline.)

**High risk / already commoditized (do not build here):**
- **Single-vendor native observability** — Google Vertex, Microsoft Foundry (most complete: App Insights + OTel + agent evals + Entra Agent ID audit), GitHub Agent HQ all ship native run dashboards/traces/HITL/provenance *today*, on OTel. For an agent living wholly inside one lab's runtime, a third-party observer is already redundant.
- **Coding-agent-on-GitHub mission control** — **GitHub Agent HQ is the single most dangerous signal**: genuinely cross-vendor (Anthropic/OpenAI/Google/Cognition/xAI agents assignable in GitHub), real-time steering, commit-to-log provenance, bundled into $10–39/user/mo Copilot with unbeatable distribution.

**Low risk / structurally defensible (labs won't or can't):**
- **Cross-vendor neutral HITL control.** No lab will build a neutral control surface that steers competitors' agents and models — it fights their "sell our models/compute" incentive. GitHub is the only one trying, and only for coding agents on GitHub.
- **Two of four labs are actively ceding the surface** (H): OpenAI is winding down its visual Agent Builder *and* native Evals (both shut Nov 30 2026) and points users to third-party Promptfoo; Anthropic ships the Agent SDK as explicit **"bring your own observability"** + HITL as a *mechanism you must build the UI around*. These are direct invitations to the independent layer.
- **Non-coding / cross-org agent operations** — Agent HQ is SWE-scoped; the broader "operate any agent run" surface (research, cron, delivery receipts, tool/deployment/provider actions — Hermes' actual list) is open.

**GitHub HQ's limits are precisely the wedge:** coding/GitHub-scoped, orchestrates agents' GitHub-side runs rather than ingesting each vendor's internal traces, requires opt-in to GitHub's ecosystem, and is walled inside paid Copilot. Out-legible it (structured events, not PR-prose) and out-neutralize it (any agent, not just GitHub-hosted; non-coding surfaces).

**Timeline:** the neutral/cross-org/non-coding wedge has an estimated **~12–24 month window** before governance-plane players (Microsoft Agent 365 = "the control plane for AI agents," GA ~May 2026) reach down from enterprise-IT. Move on depth + neutrality within that window; do not try to out-run the labs on the commodity layers.

---

## Q7 — Falsifiable customer / value hypotheses

Each has an explicit **kill criterion**. These are hypotheses to test, not claims proven by this research.

**H1 — Legibility-over-debugging.** *A human who is not the agent's author will regularly open Hermes to read "what did the agent do and why / what changed" as a narrative — and this lowers their review cost vs a trace viewer or reading the PR.*
- **Test:** instrument opens-per-run and self-reported review-time on real runs (Frank first, then 3–5 outside users).
- **Kill if:** users default back to reading the raw PR / terminal / trace and Hermes opens trend to zero after novelty. (This is the same unproven "do people read the diffs" bet flagged in `docs/fable-post-research-review.md` — carry it as the #1 risk.)

**H2 — Live-control-as-experience.** *Fusing approve/reject/stop/resume + run-state + what-changed in one live view is materially preferred over a wait-for-event mechanism + a separate dashboard.*
- **Test:** give users both an Agent-Inbox-style bare approval and Hermes' fused view; measure which they keep for real high-stakes actions.
- **Kill if:** users only ever want a Slack/email approval ping and never open the fused view to decide.

**H3 — Provenance-as-receipt beats self-report.** *Server-verified evidence (tests/build/deploy links/delivery receipts, independent of the agent's account) is trusted and acted on where the agent's own summary is not.*
- **Test:** present both; measure whether users make go/no-go decisions on the receipts vs the agent's prose, and whether a caught "agent misreported success" event occurs (cf. the Replit incident in the fable review).
- **Kill if:** users treat the agent's own summary as sufficient and ignore the receipts.

**H4 — Operators will pay a seat.** *The operator/reviewer persona will pay a per-seat price (~$20–40/mo) for legibility+control, separate from compute.*
- **Test:** put up seat pricing; convert past the free tier without bundling compute.
- **Kill if:** conversion only happens when compute/execution is bundled, i.e. they'll pay for the machine but not the human seat → revert to metered infra pricing.

**H5 — Neutrality is a purchase reason.** *Cross-agent vendor-neutrality (works over Hermes today, another agent tomorrow) is a stated reason users choose Hermes over a lab-native console.*
- **Test:** when a second real agent exists, measure whether users adopt the adapter and cite neutrality; watch whether HN's "observability can't live inside the framework" sentiment converts to willingness-to-pay.
- **Kill if:** users are happy inside one lab's console and never value a second adapter (neutrality is a nice-to-have, not a reason-to-buy).

---

## What we do not know (candid gaps)

- **"OpenClaw" is unidentified** (H that it's absent from public sources). No public product/project by that name was found; the adapter-viability argument (Q4) is made generically for "a compatible second agent." Confirm what OpenClaw is before treating it as the first adapter target.
- **No credible market size / TAM.** No citable Gartner/Forrester "AgentOps" or "agent observability" category sizing was located. Vendor growth figures (e.g. Galileo "834%") are self-reported and directional only. We are *not* fabricating a number.
- **Willingness-to-pay for *this* product is untested.** All pricing anchors are competitors'; H4 (operators pay a seat) is a hypothesis, and the HN skeptic signal ("I just use OTEL & LGTM") is a real counter-indicator of price sensitivity.
- **The core readership bet is still unproven** — inherited directly from `docs/fable-post-research-review.md` (Bet 1). This research found *no* direct evidence that humans voluntarily read agent-work diffs/provenance over time; it found strong evidence the *ability* is demanded (P3 whitespace) but weak evidence it's *exercised*. H1 is the load-bearing test.
- **Buyer procurement evidence is thin.** The demand picture rests on one vendor-run survey (LangChain, n=1,340, self-favorable) + HN anecdotes. No 2026 job-posting or procurement data was surfaced confirming a budget line named "agent operations."
- **Several competitor prices/rounds are single-source or reviewer-reported** (flagged ⚠︎ in [[catalog]]): Devin ACU, Cursor per-task, Amp $59/user, Azure/Google per-event rates, Portkey/Fiddler funding, the reported Galileo→Cisco acquisition. Re-verify at commitment.
- **Feature claims are from public pages**; login-gated features could differ (e.g. HITL-absence in obs tools is inferred from public docs).
- **Protocol churn:** OTel-GenAI conventions are *experimental* and repos recently relocated; MCP server counts vary by source. Adapter surfaces will move.
- **Timeline estimates** (the ~12–24 month bundling window; regulation impact of EU AI Act Aug 2 2026) are informed judgment, not evidence.
- **Anthropic Managed Agents' hosted HITL/observability surface** was not deep-fetched — a follow-up if positioning hinges on whether Anthropic hosts agent runs *and* their traces.
