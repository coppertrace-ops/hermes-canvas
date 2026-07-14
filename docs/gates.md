# Hermes Canvas — Wave 2 Gate Evidence Ledger

**Owner:** PROOF (Opus implementation agent) · **Rule:** no line without a real run — every row records **command · date · exit code · evidence** (output excerpt or artifact path). A failing command is recorded as a failure and fixed; criteria are never reworded to match what passed. Tokens/`Authorization` headers are redacted from all excerpts.

Base commit at Wave 2 start: `7b8c543` (main, 2026-07-14).

---

## WP0 — Wave 1 re-smoke + tree triage (baseline)

Branch: `wave2/wp0-triage`

| Criterion | Command | Date | Exit | Evidence |
|---|---|---|---|---|
| Deps install | `pnpm install` | 2026-07-14 | 0 | `Done in 404ms` (no errors; esbuild/sharp build scripts ignored — pre-existing) |
| Lint + typecheck + unit (all pkgs) | `pnpm check` | 2026-07-14 | 0 | `28 successful, 28 total` (FULL TURBO cached); only 4 pre-existing warnings in `convex/_generated/*` |
| Web unit tests | `pnpm --filter @hermes/web test` | 2026-07-14 | 0 | `Test Files 19 passed (19) · Tests 167 passed (167)` |
| Full build | `pnpm build` | 2026-07-14 | 0 | `2 successful, 2 total`; routes `/`, `/signin`, `/_not-found` built |
| Browser smoke (demo mode, port 3300) | `BASE_URL=http://localhost:3300 node e2e/browser-smoke.mjs` | 2026-07-14 | 0 | `✅ BROWSER SMOKE PASSED — 23 checks` (after selector fix below) |
| Secrets scan | `pnpm check:secrets` | 2026-07-14 | 0 | `check-secrets: OK — no tracked secrets detected.` (after false-positive fix, note 3) |

**Re-verification (fresh run, 2026-07-14, same base commit `fd8ce0a`):** baseline re-run before starting WP1. `pnpm check` → `28 successful, 28 total`; `pnpm --filter @hermes/web test` → `167 passed`; browser smoke on a clean `.next` at port 3300 → `✅ BROWSER SMOKE PASSED — 23 checks`; `pnpm check:secrets` → OK after the fix in note 3. Two discrepancies vs. the original ledger were found and resolved honestly (notes 3–4).

### WP0 triage notes

**1. `apps/web/components/chat/MessageList.tsx` (uncommitted at start).**
Diff wraps `handleScroll` in `useCallback` (deps `[hasMoreOlder, onLoadOlder, scrollRef]`), passed as `onScroll` on the transcript scroll container. `useCallback` already imported; deps correct; a benign render-stability memoization. All checks stay green with it. **Verdict: coherent — committed on `wave2/wp0-triage` as its own change.**

**2. Browser-smoke selector collision (fixed in `e2e/browser-smoke.mjs`).**
The resize-divider assertion used `[role="separator"].first()`. `MessageList.tsx`'s `DayDivider` also renders `role="separator"`, and appears earlier in the DOM, so `.first()` selected the date divider (no `aria-valuenow`, no Home/End handling) → `aria-valuenow` read `null` before/after keyboard. Root cause is the day-relative demo seed now crossing a day boundary at today's date, surfacing a `DayDivider`. The resize-divider component (`packages/render/src/layout/useResizablePane.ts`) is correct — `aria-valuenow`, Home/End, persistence all implemented. **Fix: selector narrowed to `[role="separator"][aria-valuenow]` (the resize divider is the only separator with a value).** This is an `e2e/`-owned test-selector fix, not a Wave 1 change; the browser smoke is a gate command required green at every WP exit, so a trustworthy selector is in scope.

**3. `pnpm check:secrets` false positive on a test fixture (fixed).**
The re-run found `check:secrets` FAILING (exit 1) on `apps/web/convex/authPolicy.test.ts:93` — the fabricated fixture `OWNER_BOOTSTRAP_SECRET: "the-one-time-secret-value-…"` matches the "generic bearer secret assignment" pattern (`SECRET[:=]…`). This file is a committed Wave 1 ancestor of the WP0 commit, so the scan would have failed at the original WP0 run too; the original ledger's "OK" for this line was inaccurate and is corrected here. **Fix:** `scripts/check-secrets.mjs` (ATLAS-owned) now scans line-by-line and honors an inline `check-secrets-allow` pragma — an explicit, reviewable suppression for known-safe fixtures — and reports `file:line` on real findings. The fixture line carries `// check-secrets-allow: fabricated test fixture, not a real secret`. No secret pattern was weakened; suppressions are per-line and auditable. Auth tests still pass (167/167).

**4. Browser-smoke "regression" was an environment artifact, not code.**
The first re-run smoke timed out waiting for seed text. Root cause: a **stale leftover `next dev` server from a prior session was still bound to port 3300** serving a stale `.next` (JS chunks 404'd → no client render), while a fresh `next dev` started on the default port 3000. `next dev` has no port pin in `apps/web/package.json` (`"dev": "next dev"`); the smoke expects 3300. **Resolution (env only, no code change):** kill stale servers, `rm -rf apps/web/.next`, start with `PORT=3300 pnpm --filter @hermes/web dev`. Smoke then passed 23/23. Operational note for later WPs: always start the dev server with `PORT=3300` and ensure no stale server holds the port.

---

## WP1 — Feature-flag subsystem
_pending_

## WP2 — packages/policy
_pending_

## WP3 — Content-origin app
_pending_

## WP4 — App-origin CSP
_pending_

## WP5 — HTML artifact host tile
_pending_

## G5 — Sandboxed HTML security audit (WARDEN sole sign-off)
_pending — `html_artifacts` flag stays OFF everywhere until this is green with evidence_

## WP7 — Board UI + human board mutation
_pending_

## WP8 — Jobs tab
_pending_

## G6 — Boards + jobs validation
_pending_

## WP10 — P7 hardening
_pending_

## G7 — Launch (Frank-gated)
_pending_
