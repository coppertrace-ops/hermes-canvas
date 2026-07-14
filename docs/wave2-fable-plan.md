# Wave 2 — Fable execution plan (branch `wave2-fable`)

**Date:** 2026-07-14 · **Owner:** Fable 5 agent · **Gate ledger:** `docs/gates.md` · **Status file:** `.hermes/wave2-plan/fable-status.json`

## Where the tree actually is

Wave 2 was already underway on stacked `wave2/wp*` branches (Opus agent). `wave2-fable` is cut
from `wave2/wp5-host-tile` (= all completed work). **Done with evidence in gates.md:**

| Done | Repo WP | Maps to workflow item |
|---|---|---|
| ✅ WP0 baseline re-smoke + triage | `wave2/wp0-triage` | prerequisite |
| ✅ WP1 feature flags (`html_artifacts`/`boards`/`jobs_tab`, default-off, owner-only, audited) | `wave2/wp1-flags` | workflow WP0 |
| ✅ WP2 `@hermes/policy` real (CSP builders, sandbox attr, frame protocol, sanitizer, limits) | `wave2/wp2-policy` | workflow WP1 (partial) |
| ✅ WP3 content-origin shell + generated headers + assert-headers | `wave2/wp3-content` | workflow WP1 (partial) |
| ✅ WP4 app-origin CSP floor via next.config | `wave2/wp4-app-csp` | workflow WP4 (partial) |

## Order of work (remaining, this branch)

1. **WP5 — HTML artifact host tile.** `HtmlArtifactHost` (PANES): iframe `sandbox="allow-scripts"`
   to `NEXT_PUBLIC_CONTENT_ORIGIN`, one-way `render` postMessage after shell `ready`
   (`readShellMessage` source-identity check), `height`/`render_error` handling, error shows raw
   source, focused-artifact-only live mount. Wire into `ArtifactPane` for `html-static` behind
   `useFlags().html_artifacts` (off ⇒ honest disabled state). Wire `HistoryPanel`'s
   `renderHtmlPreview` slot to the same host. Unit tests with a fake iframe/postMessage.
2. **G5 — hostile-artifact e2e + grep-guards.** `e2e/security/hostile-artifacts.mjs`
   (playwright-core): hostile HTML asserting zero egress (fetch/XHR/WS/beacon/img/CSS `url()`/
   form/prefetch — network-intercept-asserted) and no navigation/popup escape; parent ignores
   non-whitelisted messages. `scripts/check-sandbox-grep.mjs`: `allow-same-origin` (and forbidden
   tokens) appear nowhere in `apps/`/`packages/` source; wired into `pnpm check:*`. Record in gates.md.
   Flag stays OFF until green; prod flip is Frank-gated (F4).
3. **WP7 — Kanban board UI + human `editBoard`.** `components/board/BoardView` (columns/cards,
   drag = one `editBoard` mutation = one appended version); `canvas.editBoard` owner-gated Convex
   mutation via `planUpdateArtifact` (`replace_all`, board-validated, contended flows through);
   `ArtifactPane` renders `board` behind `boards` flag; `BoardDiffView` already wired via `diffArtifact`.
4. **WP8 — Jobs tab.** `jobs.listJobs` owner-gated live query (jobs + recent runs);
   `components/jobs/JobsPanel`: schedule (human-readable cron), computed next-run, last-run status,
   run history w/ `log_tail`, overdue detection per `JOBS_GRACE_*` from policy; usage/metrics card.
   Behind `jobs_tab` flag; surfaced as a third right-pane view.
5. **WP10 — hardening + docs.** `docs/threat-model.md` (incl. app `'unsafe-inline'` concession, F7
   posture), `docs/design-language.md`, runbook + agent-api currency, gates.md evidence rows,
   WAVE-STATUS update.
6. **Integration pass.** `pnpm check` (lint+typecheck+unit all pkgs), `pnpm -r typecheck`,
   prod build + browser smoke @3300, `assert-headers --local` + `--app`, hostile suite,
   `check:secrets`, final diff review, final status.json.

## Gate checklist

- **G5 (WARDEN):** hostile suite green (all egress channels network-asserted dead, no escape);
  header asserts green; grep-guard in check; parent/shell identity checks unit-proven. *Deployed*
  content-origin header assert stays F1-gated (Vercel project not yet created).
- **G6:** agent API + human drag both land as versions; simultaneous edit ⇒ contended + merge
  prompt (existing MergePrompt); job registered/reported via API appears live; stopped job shows
  overdue within grace; board diff add/move/remove correct (existing diff tests + new UI tests).
- **G7 (Frank-gated):** prod deploys, flag flips (one at a time, audited + smoked), readership
  experiment start. Not claimable from this machine.

## Risk register

| Risk | Containment |
|---|---|
| Sandbox weakened by tile integration | Sandbox attr/protocol imported verbatim from `@hermes/policy`; grep-guard + unit tests on forbidden tokens; any relaxation is F7 (threat-model amendment first) |
| Hostile e2e needs the real content origin | Serve `apps/content/out` locally with generated headers (parity already proven vs `vercel.json`); deployed re-run recorded post-F1 |
| Board drag writes thrash versions | Drag commits once on drop (one mutation = one version); rate limits already enforced in plan layer |
| `convex codegen` unavailable offline (F2) | Hand-edit `_generated/api.d.ts` additively, as WP1 did; regenerate identically once deployment exists |
| Demo mode must stay flag-off byte-identical | Flags default OFF everywhere; browser smoke re-run at each WP exit |
| Prod deploy/flip temptation | All prod actions remain Frank-gated (F1–F8); nothing here pushes or deploys |

## Working agreements

Commit per WP on `wave2-fable`; no push, no deploy. After each WP: `pnpm check`,
`pnpm --filter @hermes/web test`, browser smoke, `check:secrets`; evidence row appended to
`docs/gates.md`; status.json updated.
