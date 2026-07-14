# Hermes Canvas — Research Status

**Phase:** 1 — Evidence gathering **COMPLETE** (curation + synthesis done). Ready for Fable post-review.
**Last updated:** 2026-07-13
**Researcher:** primary evidence researcher (agent)

Do not commit/push (per instructions). No secrets in this repo.

## Live counts

| Metric | Count |
|---|---|
| Catalog entries (rows; several bundle 2–3 corroborating URLs) | 63 |
| — Primary/official-led rows (official / standards / eng-blog / press / academic / disclosure) | ~42 |
| — Community/anecdote-led rows | ~16 (remainder mixed official+community) |
| Capture files under `research/sources/` | 65 |
| Observation bullets logged | 65 + cross-cluster synthesis |

Primary vs. community is also separated *within* each capture note and flagged per catalog row (`type` + `confidence` columns).

## Coverage by cluster

| Cluster | Status | Captures |
|---|---|---|
| C1 Direct incumbents (Claude Artifacts, ChatGPT/Gemini Canvas) | ✅ complete | 12 |
| C2 Agent workspaces/IDEs (Cursor, Claude Code, Devin, OpenHands, Replit, Windsurf, Copilot) | ✅ complete | 9 |
| C3 Collaborative canvases (tldraw/Make Real, Excalidraw, Miro, Figma/FigJam) | ✅ complete | 7 |
| C4 Trace/observability + notebooks (LangSmith, Langfuse, AgentOps, Phoenix, Jupyter, Marimo, Observable) | ✅ complete | 12 |
| C5 Sync/auth/attachment infra (Convex, Supabase, Cloudflare DO/R2/Access, Yjs/Liveblocks/PartyKit/Electric, Fly/Railway/Vercel) | ✅ complete | 12 |
| C6 Security & sandboxing (iframe/CSP, prompt-injection & exfil incidents, sandbox tiers) | ✅ complete | 13 |

## Three Fable claims under test — findings

1. **Do people actually use/read persistent artifacts?** — **MIXED / conditional; weakest-supported; confidence med.** Strongest *counter*-evidence in the corpus (rubber-stamping, ChatGPT Canvas low-adoption retirement, canvas sprawl, unread traces). Readership is conditional on: renders-what-chat-can't + review-cheaper-than-re-derive + lifecycle. **Needs a real user test.** (see observations §synthesis, C1/C2/C3/C4)
2. **Safe + inexpensive agent HTML sandboxing?** — **SUPPORTED for render-only scope; confidence high.** Separate-origin sandboxed iframe (`allow-scripts` w/o `allow-same-origin`) + strict egress CSP (`default-src 'none'`) + nosniff/Content-Disposition; static config, no per-render VM — as shipped by Claude Artifacts & tldraw. "Cheap" breaks only if "render" means server-side code *execution* (microVM tier). Egress CSP mandatory. (C6, C1, C3)
3. **Versioned-artifact auditability beats trace viewers for legibility?** — **Substantially FOR, but complementary not competing; confidence med-high.** Traces = developer-audience, quantitative, noisy, machinery-over-deliverable. Versioned-artifact diff = end-user/auditor legibility. Differentiator is the **semantic diff renderer** + "what changed since you last looked". Does not replace observability for *why*-debugging. (C4, C3, C1, C2)

## Key actionable lessons (top-line; full detail in observations.md)

- **Diff-first is non-negotiable.** Targeted in-place edits + visible diff are the most-praised behavior; whole-document regenerate is universally cursed; removing granular per-hunk review caused mass backlash + data loss (C1, C2).
- **Legibility ≠ volume.** Users rubber-stamp large outputs; the win is *lowering* review cost (structural summaries, "why", risk flags), and surfacing the *ground-truth resolved action*, not the agent's self-description (C2).
- **Versioning must be durable + trustworthy + semantically diffable**, or it backfires (ChatGPT lost-work reports; nbdime exists because raw JSON diffs are unreadable) (C1, C4).
- **Canvas needs lifecycle from day one** (status/provenance/archive) or it rots into a junk drawer; plan viewport culling/spatial indexing before object counts grow; live iframes are heavy — static preview, activate on focus (C3).
- **Sandbox = static separate origin + `allow-scripts` only + `default-src 'none'` egress CSP + one-way postMessage**; prefer CSP `'none'` over host-allowlists (EchoLeak); treat all uploads as untrusted, serve from content origin with nosniff (C6).
- **Cheapest stack floor is $0–$5/mo** via all-Cloudflare (DO+R2+Access) or Convex+Access; **CRDTs are overkill for 1 human + 1 agent** (server-authoritative serialization + versioned artifacts suffices); **Vercel can't host the live channel**; **Supabase's real always-on floor is $25/mo** (free projects auto-pause) (C5).

## Method & limitations (for the post-review to critique)

- Six parallel research subagents, one per cluster; each wrote its own capture notes and returned curated catalog rows + observations, merged here by the primary researcher.
- Web evidence via WebSearch + WebFetch. **Several primary pages resisted direct fetch** (OpenAI help/launch & VentureBeat returned 403; Google SafeContentFrame is JS-rendered) — those specifics are corroborated via search extraction/secondary write-ups and are flagged `re-verify` / med confidence in the catalog.
- **Vendor-incentive bias:** much pro-artifact/pro-versioning evidence comes from vendors (Convex, Marimo, observability tools); the best-corroborated findings are the *negative* ones (rubber-stamping, sprawl, silent-overwrite, exfil incidents, Supabase auto-pause). Research leans toward tempering the pitch.
- **Pricing is time-sensitive** (accessed 2026-07-13); several products shifted recently (DO storage billing, Fly free tier, PartyKit acquisition, Y-Sweet hosting wind-down) — re-verify before any stack commitment.
- Community sentiment (HN/Reddit/X and some 2026 "review" sites) is anecdotal and labeled as such; not weighted as primary evidence.
- One HN Make Real thread was rate-limited (429) and could not be captured; an older 2023 thread with the founder's direct quotes was captured instead.

## Files

- `research/catalog.md` — all retained sources (URL · type · date/accessed · claim · confidence · capture).
- `research/observations.md` — actionable lessons per cluster + cross-cluster synthesis of the three claims.
- `research/sources/*.md` — 65 concise capture notes (primary/official separated from community within each).
