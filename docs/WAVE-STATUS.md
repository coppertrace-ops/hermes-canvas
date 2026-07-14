# Hermes Canvas — Wave Status (Fable handoff)

**Last updated:** 2026-07-14  
**Source of truth for code:** `https://github.com/coppertrace-ops/hermes-canvas` (`main`)  
**Authoritative plan:** [`docs/fable-staged-implementation-plan.md`](./fable-staged-implementation-plan.md)  
**This file:** where we actually left off — not a re-write of the plan.

---

## TL;DR for agents

| Item | Status |
|---|---|
| **Wave 1 (P0–P4)** | **Implemented in tree** — foundations, API, chat, canvas MD/Mermaid, history/diffs/last-seen, owner auth, host connector |
| **Wave 2 (P5–P7)** | **Not started as a gated wave** — start here |
| **Post-MVP** | Deferred — see [`docs/post-mvp-backlog.md`](./post-mvp-backlog.md) (headless Claude runs, etc.) |
| **Do not** | Re-scaffold Wave 1, re-run research, or invent a new architecture |

**Pick up at Wave 2 / Phase 5** after a quick Wave 1 smoke (below). Do not claim gates G0–G4 “passed” unless you re-run their exact validation commands and record evidence.

---

## Wave 2 progress (PROOF/Opus agent — live)

**Owner agent:** Opus implementation agent. **Gate ledger:** [`docs/gates.md`](./gates.md).
Base commit at Wave 2 start: `7b8c543`.

| WP | Branch | Status | Evidence |
|---|---|---|---|
| WP0 — baseline re-smoke + triage | `wave2/wp0-triage` | ✅ done | gates.md §WP0 (check 28/28, web 173, smoke 23, secrets OK). Fixed a real `check:secrets` false positive on a test fixture (auditable allowlist pragma); the original ledger's OK for it was inaccurate and is corrected. |
| WP1 — feature flags | `wave2/wp1-flags` (off wp0-triage) | ✅ done | gates.md §WP1. `flags` table + `flag_changed` event (additive); owner-only `setFlag` + atomic audit; `useFlags()`; runbook §9. |
| WP2 — `packages/policy` | `wave2/wp2-policy` | ✅ done | gates.md §WP2. Real CSP/sandbox/frame-protocol/sanitizer; 31 policy tests. |
| WP3 — content origin | `wave2/wp3-content` | ✅ done (local) | gates.md §WP3. Static shell + runtime; vercel.json headers generated from policy; local header parity 16 checks. **First deploy F1-gated.** |
| WP4 — app-origin CSP | `wave2/wp4-app-csp` | ▶ next | — |
| WP5–WP11 | — | pending | — |

**Flag states (implemented; all default-OFF, no prod flips yet):** `html_artifacts`=off, `boards`=off, `jobs_tab`=off. Flips are owner-only via `flags.setFlag`; prod flips are Frank-gated (F4).

**Branch lineage:** WP0 baseline commits live on `wave2/wp0-triage`, not `main`. Subsequent WP branches are cut from that green baseline (main lacks it). Integration target: `wave2-integration`.

### Waiting on Frank (Wave 2)
- **F1 — create/link Vercel `content` project + first deploy (WP3).** Content app is built & locally header-verified. After deploy, run and record: `node e2e/security/assert-headers.mjs --url https://<content-host>`. If the prod app origin ≠ `https://hermes-canvas.vercel.app`, set `NEXT_PUBLIC_APP_ORIGIN=<app-origin>`, `pnpm --filter @hermes/content gen-headers`, commit `apps/content/vercel.json` first (F3).
- **F2 — prod Convex deploy + owner bootstrap.** Also unblocks `npx convex codegen` (WP1's generated `apps/web/convex/_generated/api.d.ts` was hand-edited offline as the equivalent — regenerate identically once a deployment exists).

Anticipated later: **F3** prod deploys/env · **F4** prod flag flips (one at a time, audit+smoke each) · **F5** CI restore (`workflow` OAuth scope) · **F6** payment/overage · **F7** any CSP/sandbox relaxation (needs threat-model amendment first) · **F8** hermes-box job tools.

---

## Wave definitions (binding)

From the staged plan dependency spine:

```text
P0 → P1 → (P2 ∥ P3) → P4 → (P5 ∥ P6) → P7
```

| Wave | Phases | Intent |
|---|---|---|
| **Wave 1** | **P0–P4** | Prove the product thesis: direct chat + live artifacts + Markdown/Mermaid + history/diffs/changed badges + closed-owner auth + Hermes connector |
| **Wave 2** | **P5–P7** | Risky surfaces + launch: sandboxed HTML, boards + cron viewer, hardening/polish, flags on, readership experiment start |

Gates that matter for sequencing:

- **G4 (thesis)** must hold before investing hard in P5/P6. If P5/P6 threaten core quality, **slip them** — do not break G4.
- Risky features ship behind server-side flags, **default-off** until their gate passes:
  - `html_artifacts` (P5)
  - `boards` (P6)
  - `jobs_tab` (P6)

---

## Wave 1 — what is in the repo

### Shipped (code present on `main`)

| Phase | Owner roles | Evidence in tree |
|---|---|---|
| **P0 Foundations** | ATLAS + GLASS | Monorepo (`apps/*`, `packages/*`), Convex web app, UI package, owner auth modules, runbook |
| **P1 Canvas API** | LEDGER | `apps/web/convex/{schema,http,canvas,agentWrites}.ts`, `packages/contract`, `packages/connector`, `docs/agent-api.md` |
| **P2 Chat** | COURIER | `apps/web/components/chat/*` (streaming, attachments, markdown bodies, durable ack path) |
| **P3 Canvas shell** | PANES + GLASS | `apps/web/components/canvas/*`, MD/Mermaid via `packages/render` + UI |
| **P4 History / diffs** | CHRONICLE | `packages/diff`, `apps/web/components/history/*`, `lastSeen.ts`, `metrics.ts` |
| **AuthZ** | WARDEN/ATLAS | `authGuard` / `requireOwner` on browser writes; service-token path for agent |
| **Host connector** | Hermes ops | Plugin on hermes-box; see [`docs/host-connector-status.md`](./host-connector-status.md) |

### Known Wave 1 gaps / honesty flags

These are **not** excuses to redo Wave 1. Fix opportunistically or as Wave 2 prerequisites.

1. **GitHub Actions CI workflow is not on `main`** — removed from push history due to missing GitHub `workflow` OAuth scope on the coppertrace token. Re-add `.github/workflows/ci.yml` once `workflow` scope is available (or via UI). Local typecheck/test still expected.
2. **Gate evidence is incomplete in-repo** — plan gates G0–G4 require exact validation commands; do not treat “code exists” as “gate signed.” Re-run PROOF checks before calling Wave 1 closed for launch.
3. **Docs still missing from plan list:** `docs/threat-model.md`, `docs/design-language.md` (called out for P7).
4. **Inbound Canvas → Hermes chat bridge is provisional** (poller/Telegram mirror), not long-term same-session inject — see host connector status.
5. **Chat UX follow-ups already noted by Frank:** open at latest message; page older messages like iMessage (partially addressed in commits; re-verify live).
6. **Feature flags `html_artifacts` / `boards` / `jobs_tab` are planned, not fully productized** as server-side kill switches in prod.

### Wave 1 smoke (do this before Wave 2 coding)

```bash
# from repo root after pnpm install + env from .env.example (never commit secrets)
pnpm -r typecheck   # or package-local equivalents if script names differ
pnpm --filter @hermes/web test
# if e2e present:
pnpm --filter @hermes/web exec playwright test   # adjust to actual script
```

Manual product smoke:

1. Owner sign-in works; non-owner rejected.
2. Human message → agent reply (live or mock) appears; hard refresh keeps history.
3. Agent creates/updates markdown + mermaid artifact; UI shows without full reload.
4. History panel shows versions with why/author; restore appends (does not rewrite history).
5. Host connector: `canvas_list_artifacts` / post_message still works against Convex `/agent/*`.

---

## Wave 2 — what to build next

### Phase 5 — Sandboxed HTML artifacts (flag: `html_artifacts`)

**Owners:** WARDEN (sandbox), PANES (tile), GLASS (chrome), CHRONICLE (before/after in history)

**Build:**

- Separate **content-origin** app shell (`apps/content` exists as scaffold — complete it).
- Hard sandbox: no network egress, no navigation/popup escape, no `allow-same-origin` + `allow-scripts` combo.
- postMessage protocol with origin verification both ways.
- Host mounts HTML artifacts only for focused tab; errors show source, never silent blank.
- Wire CHRONICLE `HtmlDiffView` to real before/after versions.

**Gate G5 (WARDEN sole sign-off):** hostile HTML suite asserts zero egress (fetch/XHR/WS/beacon/img/CSS url/form/prefetch) + no escape; CSP/header CI asserts; flag stays off until green.

### Phase 6 — Kanban boards + cron / jobs viewer (flags: `boards`, `jobs_tab`)

**Owners:** PANES (UI), LEDGER (API already partially in contract), CHRONICLE (board diffs)

**Build:**

- Board renderer: columns/cards; drag = one mutation = one version (append-only).
- Board JSON from `packages/contract` / `packages/diff` board support — implement UI + agent writes, not a new schema language.
- Cron/jobs tab: live runs, next-run, overdue when agent stops reporting.
- Human drag + agent update both land; simultaneous edit → contended + merge prompt (never silent clobber).

**Gate G6:** agent+human board path works; overdue jobs visible; board diffs for add/move/remove correct.

### Phase 7 — Hardening, polish, launch

**Owners:** PROOF leads; WARDEN + GLASS sign-offs; all roles

**Build / finish:**

- Full regression e2e; restore billing probe against real usage.
- Backup/export path verified once (`npx convex export` → scratch restore).
- GLASS polish: spacing, motion, contrast, keyboard, empty states.
- WARDEN re-audit + prompt-injection fire drill (hostile attachment tries to exfiltrate → every channel dead-ends + audit event).
- Complete docs: threat-model, design-language, runbook gaps, agent-api currency.
- Restore CI workflow on GitHub.
- Flip flags on in prod only after G5/G6; start **4-week readership experiment** (unread badges / unopened diffs / write-only artifacts = kill signal for fancy versioning UX).

**Gate G7 — launch:** flags on, checklists green, instrumentation live.

---

## Recommended Wave 2 execution order

```text
1. Re-smoke Wave 1 (above) — fix only blockers for P5/P6
2. P5 sandbox (G5)  ──┐
3. P6 boards+jobs     ├── parallel only if ownership paths don't thrash
4. P7 hardening / polish / launch (G7)
```

Rules of engagement (from `AGENTS.md` + plan):

- Split work by **phase + path ownership**, not arbitrary turn budgets.
- Run agents to **verified completion**; never mark a gate done without the exact command passing.
- **Additive schema only** after G1.
- Secrets never in git; use Convex/Vercel env + hermes-box `.env`.
- Prefer flag-off rollback over hero reverts for P5/P6 regressions.

---

## Out of scope for Wave 2

- Generic multi-tenant productization / Clerk-class auth expansion
- OpenClaw adapters (Hermes-first; adapters after personal signal)
- Headless Claude Code run primitive as a first-class artifact type → **post-MVP** ([`post-mvp-backlog.md`](./post-mvp-backlog.md))
- CRDT collaborative editing, public multiplayer
- Replacing Convex+Vercel stack mid-wave

---

## Pointers

| Need | File |
|---|---|
| Full staged plan | `docs/fable-staged-implementation-plan.md` |
| Agent HTTP contract | `docs/agent-api.md` |
| Deploy / owner bootstrap | `docs/runbook.md` |
| Live host connector | `docs/host-connector-status.md` |
| Chat platform sub-plan | `docs/fable-staged-plan-canvas-chat-platform.md` |
| After Wave 2 ideas | `docs/post-mvp-backlog.md` |
| Product brief | `docs/brief.md` |

---

## Repo / ops notes for Fable on a fresh machine

```bash
git clone https://github.com/coppertrace-ops/hermes-canvas.git
cd hermes-canvas
# Node 22 / pnpm via packageManager field
corepack enable && pnpm install
cp .env.example apps/web/.env.local   # fill from Convex/Vercel — do not commit
```

- **Public repo:** `coppertrace-ops/hermes-canvas`
- **Mac mini worktrees** (`wave1/*`) are historical; **`main` on GitHub is canonical**
- Live Convex site (agent API) documented in host connector status — treat tokens as secrets

When Wave 2 starts, **update this file** with: branch name, owner agent, gate evidence links, and flag states.
