# Agent Control Plane — Vendor Catalog

**Accessed:** 2026-07-13 (all rows unless noted). **Rules:** prices from official pages unless flagged `⚠︎unverified` (third-party/reviewer) or `contact-sales`. Confidence: `H`/`M`/`L` per [[status]]. "Rel to Hermes" = Direct / Near / Adjacent to a *human-first, cross-agent operations workspace* (run state + what-changed + evidence + controls). Source column points to `sources/<file>.md`.

Legend for HITL model: **live-gate** = pauses a running agent for approval before it acts; **offline** = annotate/label finished runs; **review-after** = observe replays, no gate; **none** = observability only.

---

## Segment 1 — LLM / agent observability & tracing

| Product | What it is | Buyer | HITL | State/provenance | Deploy | Price (2026-07-13) | Rel | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|
| LangSmith | Agent tracing + evals (LangChain) | AI/ML + app eng | offline (annotation queues); live HITL punted to LangGraph Platform | read-only traces | SaaS; self-host (Ent) | $0 / $39 seat/mo; traces $2.50–5.00/1k | Near | H | obs-langsmith |
| Langfuse | OSS trace/eval store | AI/ML + platform (OSS) | offline (tier-gated) | read-only trace store | OSS(MIT)+cloud+self-host | Free / $29 / $199 / $2,499 mo | Adjacent | H | obs-langfuse |
| Arize AX | Agent trajectory evals, "agent-as-judge" | Enterprise AI/ML | offline labeling | span/session store + alerting | SaaS; Ent self-host | Free / $50 mo / Ent | Adjacent | H | obs-arize-ax |
| Arize Phoenix | OSS agent tracing/eval | Devs / AI eng | offline | local trace store | OSS(ELv2)+2 free cloud | Free | Adjacent | H | obs-arize-phoenix |
| Braintrust | Eval-first + structured human review | AI/ML + product | offline review (no queues/gates) | traces→datasets | SaaS + Ent self-host | $0 / $249 mo / Ent | Near | H | obs-braintrust |
| W&B Weave | Strongest agent-trace model | AI/ML teams | offline annotation scorers | trace/session store | Cloud+Dedicated+self-managed | Free / $60+ mo; ingest $0.10/MB | Near | M-H | obs-wandb-weave |
| Helicone | Request-centric obs + gateway | Devs / fast AI cos | none | request logs | SaaS + OSS self-host | Free / $79 / $799 mo | Adjacent | M-H | obs-helicone |
| Traceloop / OpenLLMetry | Agent-aware OTel tracing SDK | Platform (OTel shops) | none | traces→any backend | OSS(Apache2)+SaaS | Free(50k spans) / Ent | Adjacent | H | (obs) |
| HoneyHive | "Purpose-built for agents," DAGs | AI/ML + SMEs | offline queues + escalation | read-oriented, no run state | SaaS; Ent self-host | Free(10k) / Ent | Near | H | (obs) |
| Comet Opik | Agent optimizer + audit logs | AI/ML + governance | offline queues | provenance-rich but review-only | OSS(Apache2)+SaaS+Ent | Free / $19 mo / Ent | Near | H | (obs) |
| Datadog LLM/Agent Obs | APM-integrated agent obs (rebranded) | AI eng + SRE (DD orgs) | offline queues | telemetry + versioned datasets | SaaS only | $160/mo(100k spans)+$3.50/10k | Adjacent | H | (obs; child) |
| New Relic AIM | Agentic obs, agents as entities (Nov'25) + MCP | AI/ML + SRE | end-user feedback only | read-only telemetry | SaaS | 100GB free, $0.40/GB + seats $49–349 | Adjacent | H | (obs; child) |
| Galileo | "Agent Reliability Platform" + guardrails | AI/ML + platform | offline + CLHF; auto (non-human) guardrails | traces + auto guardrails | SaaS + hybrid | Free(5k) / $100 mo / Ent | Near | H | signal-galileo, orch-galileo-agent-control |
| AgentOps | Session replay / time-travel debug | Agent devs | none | read-only replay | SaaS + MIT SDK + Ent | Free(5k) / ~$40 mo⚠︎ / Ent | Adjacent | H(L on $) | hitl-agentops |
| Maxim AI | Simulation + multi-turn sessions + human queues | Eng + product (no-code PM) | offline review queues (prod-log triggered) — closest on human axis | trace+eval store; not orch state | SaaS | Free / $29 / $49 seat/mo / Ent | Near/Direct | H | (obs; signal) |
| Langtrace | OTel agent-framework tracing | Devs / platform | none | trace store | OSS(AGPL)+self-host+SaaS | Free(10k) / $39 user/mo | Adjacent | M | (obs) |

**Segment verdict:** read-only tracing + offline eval is fully saturated and commoditizing (OTel/OpenInference standardization → race to the bottom; many free OSS options). "Agent-focused" is table-stakes marketing. No product offers a **live in-the-loop gate** or a **durable, actionable run object**; provenance = trace lineage for debugging, not a versioned legible artifact.

---

## Segment 2 — Agent orchestration platforms & control planes

| Product | What it is | Buyer | HITL | State/provenance | Deploy | Price | Rel | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|
| LangGraph / LangSmith Deployment + **Agent Inbox** | Durable run plane + only real human review surface (Accept/Edit/Respond/Ignore) | Dev-first→ent | **live-gate** (interrupts + Inbox) | checkpoints, threads, time-travel | Cloud/self-host/hybrid | $0 / $39 seat + usage; Ent | **Direct** | H | orch-langgraph, hitl-langchain-agent-inbox |
| CrewAI + AMP/Enterprise | Multi-agent framework + deploy dashboard | Dev+no-code+F500 | partial (framework input) | traces/logs; no time-travel | SaaS/OSS/private | Free(50 exec) / Ent custom | Adjacent | H | orch-crewai |
| Microsoft Agent Framework (AutoGen/AG2) | Multi-agent SDK (GA v1.0 Apr'26) | .NET/Py devs, MS shops | framework HITL + pause/resume | checkpointing | OSS→Azure Foundry | OSS free (hosted=Foundry) | Adjacent | H | (orch) |
| Vercel AI SDK + Workflow (WDK) | Managed durable run plane + obs | TS/JS web devs | wait-for-event pause/resume | deterministic replay | OSS + managed SaaS | WDK free; usage-based; Pro $20/user | Near | H | (orch) |
| Inngest AgentKit | Durable run plane + agent networks | TS/JS devs | waitForEvent (e.g. 4h ask_developer) | step memo/replay, retries | SaaS + self-host | Hobby $0(50k) / Pro $99 (+$50/1M) | Near | H | orch (dur-inngest) |
| LlamaIndex / LlamaCloud | RAG + multi-agent handoff | App/AI devs | framework-level | partial | OSS+SaaS/hybrid | Free / $50 / $500 mo / Ent | Adjacent | H | (orch) |
| Restack | Durable-agent platform + audit trails | IT/ops + product | partial (escalation) | state months/years, retries | OSS+SaaS+BYOC+on-prem | $25/user; BYOC $999/mo; compute $0.00185–0.017/min | Near | H | (orch) |
| Orkes Conductor | Mature workflow UI + explicit approvals | Enterprise platform | **live-gate** (approvals, resume-after-human) | durable exec + full audit | OSS+SaaS+self-host | Free Dev; Ent custom | Near | H | (orch) |
| Temporal | Best-in-class durable exec + run UI | Devs + infra/ent | Signals (first-class) | event-sourced replay | OSS + Cloud | $50/1M Actions; floor $100–500/mo | Near (substrate) | H | dur-temporal |
| AWS Bedrock AgentCore | Managed agent runtime (12 modules) | AWS enterprise | via policy/registry (no human gate found) | Memory + CloudWatch traces | Cloud (AWS) | $0.0895/vCPU-hr + $0.00945/GB-hr | Adjacent | H | (orch; child) |
| Azure AI Foundry Agent Service | Managed agent runtime + richest native obs | Azure enterprise | **durable "wait days for approval"** (requires_action) | sessions survive restarts; Entra Agent ID audit | Cloud (Azure) | No platform fee; pay models+tools+compute (~$0.099/vCPU-hr⚠︎) | Adjacent | H | (orch; child) |
| Google Vertex/Gemini Ent. Agent Engine | Managed runtime + metrics dashboard + Trace | GCP enterprise | ADK layer (ToolConfirmation) | Sessions + Memory Bank | Cloud (GCP) | $0.085/vCPU-hr + $0.009/GB-hr; sessions $0.25/1k | Adjacent | H | (orch/lab; child) |
| DBOS | Durable exec library + Conductor console | Devs wanting durability | await external input (DIY) | checkpointed to *your* Postgres; time-travel | OSS+Conductor SaaS/self-host | Transact free; Pro $99 / Teams $499 mo | Near (substrate) | H | dur-dbos |
| Burr (Apache/DAGWorks) | State-machine lib + local UI | Python devs | **pause-for-human at any step** | pluggable persisters, time-travel | OSS self-host | Free (Burr Cloud waitlist) | Direct-ish (OSS lib) | H | (orch; child) |
| OpenHands Enterprise (Agent Control Plane) | Coding-agent fleet governance + audit | Enterprise platform/security | policy/access gates (not human inbox) | full activity record, cost attribution | Self-host/on-prem | contact-sales | Adjacent | H | orch-openhands-control-plane |
| Galileo Agent Control | Governance plane (step enforce) | Ent trust & safety | policy deny/steer/warn (not human) | logs enforcement decisions | OSS(Apache2)+hosted | Agent Control free/OSS | Adjacent | H | orch-galileo-agent-control |

**Segment verdict:** the run-control-plane *primitive* (durable exec + dashboard + resume/replay) is saturated and commoditizing (~$0.05/M actions or ~$0.085–0.099/vCPU-hr). HITL is a ubiquitous *mechanism* but only LangChain Agent Inbox is a real human *experience*. The 2026 "agent control plane" branding rush is heading to **fleet governance/identity/cost**, not individual-run legibility.

---

## Segment 3 — Coding-agent run dashboards & fleet/mission control

| Product | What it is | Buyer | Multi-run console | Events | Provenance | Human controls | Hosted/BYO | Price | Rel | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **GitHub Agent HQ / Copilot coding agent** | Cross-vendor mission control in GitHub | GitHub devs/orgs | **yes (cross-vendor)** | session logs (native) | deep: branch/commits/PR/Actions | assign/steer/pause/restart/approve | hosted | in paid Copilot ($10–39/user) | **Direct (biggest threat)** | H | code-github-agent-hq |
| Devin (Cognition) | Autonomous SWE + Teams admin dashboard | Eng teams/ent | partial (parallel Devins) | IDE artifacts + terminal | branch/commit/PR/diff/tests | steer, edit, run tests | hosted VMs | Free/$20/$200; Teams $80+$40; ACU ~$2.25⚠︎ | Near | H | code-devin-cognition, code-devin-manage-devins |
| OpenAI Codex (cloud) | Parallel cloud tasks | ChatGPT devs→ent | task list (usage dash only) | summaries+diffs+tests | per-task diff/tests/PR | inspect/follow-up/PR | hosted (BYOK via API) | Free/$8/$20/$100+; Business $20 | Near | H | code-openai-codex, code-codex-pricing |
| Cursor Cloud / Background Agents | Parallel background agents, multi-surface | IC dev/eng teams | yes | structured (no public event API) | branch clone+push; PRs+artifacts | steer; remote-desktop takeover | managed + **BYO-compute** | Pro $20/$60/$200; Teams $40 | Near | H | code-cursor-background-agents |
| Google Jules | Async task→PR + **structured API** | Devs | yes (task list) | Sources/Sessions/Activities API | repo/branch/diff/PR | approve plan, steer | hosted VM | Free 15/day; Pro ~$20; Ultra $125–200 | Near | H | (code) |
| Claude Code on the web | Parallel tasks across repos | Pro/Max devs | partial | structured under hood, UI summary | auto-PR + change summaries | steer mid-run | hosted sandbox | beta; shares Claude Code limits | Near | H | code-claude-code-web |
| Claude Agent SDK | Headless run primitive (BYO-UI) | Platform builders (Hermes-type) | no (library) | **typed events** + ResultMessage(cost/turns) | you emit | interrupt(); can_use_tool approve/deny/rewrite | **BYO-compute/UI** | model token pricing | **Enabler** | H | code-claude-agent-sdk |
| Factory.ai (Droids) | "Mission Control" + Analytics | Enterprise eng | yes | OpenTelemetry (aggregate) | strong: git source-of-truth, all actions logged | approve plan, redirect, Droid Shield | hosted + BYOK | Pro $20/$100/$200; Ent custom | Near | H | code-factory-droids |
| Sourcegraph Amp | Threads + leaderboards | Power-devs/teams | partial | thread/message (chat) | rides GitHub PR | steer in-thread | hosted + self-host; BYO models | Free $10; usage; $59/user⚠︎ | Adjacent | M-H | code-sourcegraph-amp |
| Sculptor (Imbue) | Parallel agents, **persisted structured run state** | Indie→team safety-conscious | yes | **saves plans/tool-calls/changes** (closest to structured) | container+git; conflict flag | Pairing-mode takeover, instant test | local containers, BYOK | Free beta | **Direct (legibility)** | H-M | (code) |
| omnara (YC S25) | "Mission Control" web+mobile+watch | Indie on-the-go | yes | structured messaging + terminal | via underlying agent (thin) | approve/answer/steer from phone | OSS + hosted; BYO agent | Free~10/mo; ~$9/mo⚠︎ | **Direct (remote HITL)** | H-M | (code) |
| Conductor (Melty Labs) | Dashboard over parallel Claude Code | Indie/small Mac teams | yes | tiled terminals + diff | worktree/branch/diff/PR/checkpoints | review/merge, checkpoint rollback | local Mac, BYO Claude | free today; $22M A⚠︎ | Direct | H-M | (code) |
| Vibe Kanban (Bloop) | Kanban of agent tasks | Indie/small team | yes | mixed (diffs structured, terminal per workspace) | worktree/branch/diff/PR | inline diff, steer, merge | BYO-compute + BYO agent | Free Apache2 (**sunsetting**) | Direct | H | code-vibe-kanban |
| Claude Squad | TUI list of tmux agents | Terminal-native indie | partial | **pure terminal scrape** | worktree/branch/diff/commit | pause/checkout/resume/push | local, BYO agent | Free AGPL3 | Adjacent | H | (code) |
| Crystal (→Nimbalyst) | Desktop session list | Indie | partial | terminal + diff compare | worktree/branch/diff/rebase | compare, keep winner | local Electron | Free MIT (**deprecated**) | Adjacent | H | (code) |
| Terragon/Terry | Cloud task dashboard | Delegation devs | yes | PR/diff async | branch/AI commits/PR/checkpoints | async PR + local takeover | hosted | **shut down ~Jan 2026** | Adjacent | H | (code) |
| Async (bkdevs) | Linear-style task board | Devs, mature codebases | yes | PR/subtask-diff | branch/stack diffs/PR | clarifying-Q gate, confirm-before-run | hosted (OSS server) | not disclosed | Adjacent | M | (code) |
| Sweep / Charlie / Tembo | Issue→PR, embedded in GitHub/Slack/Jira | Teams (no workflow change) | no console | GitHub-native | GitHub PR | PR review; Charlie .md deny-rules | hosted; BYO-LLM | Sweep $40 credits; Tembo Free/$60/$200; Charlie waitlist | Adjacent | M | code-sourcegraph-amp (adj) |

**Segment verdict:** structured-event primitives exist (Agent SDK typed events, Jules Activities API, Factory OTel) but the *legible multi-run UI over those events* does not — everyone collapses legibility into "a PR" or scraped terminals. Provenance is universally git-shaped; **model/version, tool-event timeline, tests, and deploy links are thin-to-unoccupied**. Enterprise players punt live per-run obs to your own OTEL. Indie cluster consolidating/attriting fast. GitHub is bundling this — but coding/GitHub-scoped.

---

## Segment 4 — Human-in-the-loop / supervision / agent inbox

| Product | HITL model | Evidence/provenance | Dev vs biz | Buyer | Deploy | Price | Rel | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|
| **HumanLayer** (+ACP, CodeLayer) | live-gate on tool calls (approve/deny/escalate/timeout); pivoting to coding IDE | partial (tool call/params) | **dev** | AI eng team | SDK+cloud+K8s+desktop | Free / Pro $100/user / Ent | **Direct (namesake)** | H | hitl-humanlayer |
| **LangChain Agent Inbox / interrupt()** | live-gate, tool-scoped (approve/edit/reject/respond); durable | yes (graph state/thread) | **dev** | LangGraph builder | OSS + LangGraph Platform | free/OSS | **Direct** | H | hitl-langchain-agent-inbox |
| n8n | live-gate tool approval | reviewer sees AI params | dev-ops | automation builder | self-host OSS/Cloud | execution-based⚠︎ | Near | H | hitl-n8n |
| Lindy | live-gate per-action confirm | drafted action only | biz | ops/non-dev | SaaS | credit-based (n/c) | Adjacent | H | hitl-lindy |
| Relay.app | live-gate + review-any-step | per-step output | biz | ops teams | SaaS | Free / $19 / $69(≤10) mo | Near | H | hitl-relay-app |
| Vellum | live-gate + eval gates | eval/monitoring views | dev-leaning | AI product/eng | SaaS | sales-led; ~$50–79/mo⚠︎ | Near | M | hitl-vellum-gumloop |
| Gumloop | live-gate before external action | node-graph only | biz | non-dev | SaaS | not captured | Adjacent | M | hitl-vellum-gumloop |
| Respell | inbox Accept/Reject + resume | partial | biz | non-dev | SaaS | Free 125 tasks (→Salesforce) | Adjacent | H | hitl-respell |
| ServiceNow AI Control Tower | governance + kill-switch + exception routing | enterprise-wide | biz/IT | CIO/risk | ServiceNow cloud | Ent/custom (GA ~Aug'26) | Near (narrative) | H-M | (hitl) |
| Salesforce Agentforce Command Center | observability + real-time supervision | OTel + Data Cloud | biz | CX/service leaders | Salesforce cloud | consumption/per-conversation | Near (narrative) | H | (hitl) |
| UiPath Maestro | exception-routed tasks + live pause/resume/rewind/skip | full audit trail | biz/ent | automation CoE | Cloud/on-prem | Ent/custom | Near | H | (hitl) |
| Sierra / Decagon | AI-supervisor / QA watchtower + trace view | reasoning/systems accessed | biz (CX) | support leaders | SaaS | outcome/not public | Adjacent | H | (hitl) |
| Autoblocks / Coval | async SME annotation / sim eval | test-result level | dev+SME | AI product/voice teams | SaaS | contact-sales | Adjacent | H | (hitl) |

**Segment verdict:** HITL as a *feature* (an approval node) is saturated across every workflow builder; HITL as a *product* (a dedicated console fusing run-state + what-changed + evidence + lifecycle control) is not. No single monetized developer-facing product occupies it. Enterprise "control towers" own the narrative for the business/IT buyer, not the developer/operator.

---

## Segment 5 — Durable execution / provenance / cron & delivery receipts

| Product | Run dashboard/replay | Provenance model | Cron obs | Agent-specific | Buyer | Deploy | Price | Rel | Conf | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| Temporal | Web UI event-history + replay | append-only Event History | Schedules | yes (OpenAI SDK integ GA Mar'26) | platform/infra eng | Cloud/self-host | Essentials $100 / Business $500 mo; $50/1M | Near (substrate) | H | dur-temporal |
| Restate | timelines + journal replay | durable journal/invocation | delayed/scheduled | yes | backend/platform | Cloud/self-host | Free 50k/mo; usage-based (n/p) | Near | M-H | dur-restate |
| DBOS | Conductor: monitor/fork/replay + time-travel | checkpoints in *your* Postgres | scheduled + OpenMetrics | partial | backend eng | OSS+Cloud/self-host | Pro $99 / Teams $499 mo | Near | H | dur-dbos |
| Inngest | per-invocation + retry rows + bulk replay | events→DB history | cron fns + tracing | AI workflows | full-stack eng | Cloud+self-host | Hobby $0 / Pro $99 (+$50/1M) | Near/Direct | H | dur-inngest |
| Trigger.dev | replay/cancel + OTel + Realtime stream | server run/step records | dedicated scheduled tasks | yes ("managed AI agents") | TS/JS teams | Cloud+self-host OSS | Free / Hobby $10 / Pro $50 | Near/Direct | H | dur-triggerdev |
| Hatchet | real-time searchable dashboard + replays | every invocation persisted (PG) | cron + OTel export | yes (AI agents) | backend/platform | Cloud+self-host OSS | not published (no fabrication) | Near | M-H | dur-hatchet |
| Windmill | run history/logs/audit | run history + audit trails | cron/webhooks | no (general) | internal-tools/platform | self-host OSS+Cloud | Cloud free 1k/day; Team $10/user | Adjacent | M-H | (dur) |
| Convex | live step history (reactive) + crons view | durable step records, reactively legible | native crons in dashboard | yes | full-stack TS | Cloud+self-host OSS | platform pricing | Near/Direct | H | (dur) |
| Cloudflare Workflows/DO | instances + AST flowchart | per-instance step state in DO SQLite | Cron Triggers + alarms | agent-capable (Agents SDK) | Workers/edge devs | Cloudflare only | 10M req incl; +$0.80/100k steps | Adjacent | H | (dur) |
| Vercel Workflow (WDK) | steps/inputs/outputs recorded; realtime | recorded journal, deterministic replay | Vercel Cron (separate) | yes (AI agents) | TS/Next.js | Vercel-managed (OSS) | Beta obs free; steps+storage billed | Near | H | (dur) |
| Cronitor | status pages + alerts, 12-mo retention | append-only ping log (independent) | **yes (core)** | no | SRE/ops | SaaS | Free 5; Business $2/monitor+$5/user | Adjacent (receipt model) | H | (dur) |
| Healthchecks.io | historical ping log | append-only ping receipts (independent) | **yes (core)** | no | SRE/ops, small teams | SaaS + self-host OSS | Free 20; Business $20 / $80 mo | Adjacent (receipt model) | H | (dur) |
| OpenLineage + Marquez | Marquez run/job/dataset lineage graph | append-only lineage events; W3C PROV-aligned | pipeline runs | no (data) | data eng/governance | OSS + managed | OSS free | Adjacent (schema prior art) | H | (dur) |
| Agent-audit / KYA (emerging) | not yet polished UI | cryptographically sealed, tamper-evident vs mutable logs | n/a | yes (agents) | security/GRC | whitepapers/SIEM | nascent | Direct (thesis) / pre-product | M | (dur) |
| Letta / Zep / mem0 | Letta ADE traces; Zep bitemporal graph | memory persistence; Zep valid_from/to (audit-ish) | no | yes | AI/agent devs | OSS + Cloud | Letta free 5k; Zep $25/$99; mem0 $19/$249 | Adjacent | M-H | (dur) |

**Segment verdict:** durable-run truth (append-only history + replay, independent of agent self-report) is a **solved commodity**, but exposed to the workflow *author* as debugging plumbing — not to an operator as legible run state. Delivery-receipt/dead-man's-switch semantics live in a separate cron-monitoring niche, blind to run content. Tamper-evident agent provenance is a real, early, regulation-driven category (EU AI Act full enforcement Aug 2, 2026) with no product-grade legible UI yet.

---

## Segment 6 — Frontier-lab first-party platforms

| Platform | Native dashboard/traces | HITL | Provenance/audit | Model-locked | Dev vs operator | Availability/price | Source |
|---|---|---|---|---|---|---|---|
| OpenAI AgentKit / Agent Builder | visual preview + Logs>Traces — **Agent Builder sunsets Nov 30 2026** | trace grading (**winding down**) | trace records; Connector Registry | **yes** (cross-model only via OSS Agents SDK) | dev → ChatGPT workspace | ChatKit GA; Builder deprecating | lab-openai-agentkit |
| OpenAI Evals | native eval | human grading | — | yes | dev | **winding down; → Promptfoo; shut Nov 30 2026** | (lab) |
| Anthropic Claude Agent SDK | **no hosted viewer — BYO via OTLP**; traces beta, off by default | **yes native primitive** (canUseTool/defer/notify) — you build the UI | per-user tool-decision events → your SIEM | **yes** (Claude) | dev | SDK free; per-token | lab-anthropic-agent-sdk |
| Anthropic Console / Claude Code / Enterprise | Claude Code = adoption/spend analytics, not run traces | admin controls | Compliance API Activity Feed; audit CSV | yes | admin (analytics), dev (SDK) | Team $20–25; Premium $100–125; Ent $20+usage | (lab) |
| Google Vertex AI Agent Engine | **yes** metrics dashboard + Trace + playground | ADK layer | traces + tool-governance registry | Gemini-centric (can host others) | dev | runtime billed since Nov 6 2025 | lab-google-agent-engine |
| Google ADK | **yes** built-in OTel→Cloud Trace + eval | ToolConfirmation, pause/resume | HITL trace event types (BigQuery) | **no — model-agnostic** | dev | free/OSS | (lab/proto) |
| Google Agentspace → Gemini Enterprise | end-user chat layer | product-level | enterprise governance | Gemini front door | **operators/"every employee"** | Ent SKU (folded Oct 9 2025) | (lab) |
| GitHub Agent HQ | **yes** fleet dashboard + session logs + commit provenance | **yes real-time steering** | commit-to-session-log audit | **no — hosts Anthropic/OpenAI/Google/Cognition/xAI** | dev (coding, GitHub-scoped) | in paid Copilot; AI Credits since Jun 1 2026 | lab-github-agent-hq |
| Microsoft Foundry Agent Service + Observability | **yes — richest native** (App Insights + OTel + agent evals) | guardrails + HITL processes | **Entra Agent ID** identity + all activity logged; governs non-MS agents | **no — cross-model + cross-framework** | dev-first → IT admin (Agent 365) | consumption; Agent Framework 1.0 GA Apr 3 2026 | lab-microsoft-foundry |

**Segment verdict:** single-vendor native observability is **already commoditized** (Google, Microsoft — most complete, GitHub all ship it on OTel). Bundling is shipping now, not future. But two of four labs are *retreating* from the surface (OpenAI sunsetting Builder/Evals; Anthropic explicitly BYO-observability + build-your-own-approval-UI), and no lab will build a *neutral* control surface for competitors' agents.

---

## Segment 7 — Protocols & standards (adapter substrate)

| Protocol | Standardizes | Backers / governance | Adoption signal | Helps/hurts independent control plane | Source |
|---|---|---|---|---|---|
| **MCP** | tool/context attach ("USB-C for AI") | Anthropic → LF Agentic AI Foundation (Anthropic, Block, OpenAI, +Google/MS/AWS/CF) Dec'25 | "10,000+ public servers"; "97M+ monthly SDK downloads" (Anthropic) | **tailwind** — common choke point to observe/gate tool calls across vendors; risk labs bundle native MCP obs | proto-mcp |
| **A2A** (absorbs IBM ACP) | agent↔agent comms + discovery (Agent Cards) | Google → Linux Foundation Jun'25; 150+ orgs | "enterprise production use in first year" | **tailwind** — one schema to mediate multi-agent; no telemetry (complementary) | proto-a2a |
| **OTel GenAI / agent semconv** | traces/spans/metrics vocab (invoke_agent, execute_tool, plan) | OTel GenAI SIG (Amazon/Elastic/Google/IBM/MS/Traceloop…) | Datadog "natively supports"; broad emit/ingest; **still experimental** | **tailwind for ingestion + commoditization caveat** — "ingest any agent's telemetry" near-commodity; differentiate *above* ingestion | proto-otel-genai |
| **AGNTCY / Agent Connect** | discovery, identity, messaging, **observability** for multi-agent | Cisco + LangChain + Galileo → LF Jul'25; 65+ cos | interops w/ A2A + MCP | **tailwind + watch** — claims observability as shared infra (validates category, could commoditize plumbing) | proto-agntcy |
| **AG-UI** | agent↔frontend event stream (SSE: TOOL_CALL, STATE_DELTA, lifecycle) | CopilotKit-led (no foundation yet) | LangGraph, CrewAI, MS Agent Framework, ADK, Strands | **mild tailwind (adjacent)** — standard live event stream to render activity + inject approvals; CopilotKit an adjacent competitor if it adds controls | (proto) |
| IBM ACP | agent comms | merged into A2A (LF Aug'25) | deprecated standalone | consolidation — fewer adapters | (proto) |

**Segment verdict:** protocol standardization under neutral foundations is a **real tailwind for the Hermes-first + adapters (OpenClaw) strategy** — it de-risks and commoditizes vendor adapters. The same standardization means "we ingest and display traces" is **not a moat**; the moat is the legibility/control/provenance layer *above* the standardized event stream.
