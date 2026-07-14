# Hermes Canvas — threat model (WARDEN)

The security contract for Wave 2's risky surfaces (sandboxed HTML artifacts,
boards, jobs) and the app-wide hardening that carries them. Every control named
here is backed by code and a test; the enforcement column points at the file and
the gate command. This document is also the required home for any CSP/sandbox
concession (plan §10 rule 2: a relaxation needs a written threat-model amendment
first — that is an **F7** action, Frank-gated).

Scope: the personal single-owner MVP. Multi-tenant concerns are out of scope
(there is exactly one account; see `docs/runbook.md` §2–§5).

## 1. Trust boundaries — three origins, three trust levels

| Origin | Trust | What runs there | Hostile-input surface |
|---|---|---|---|
| **App** (`web`, `*.vercel.app`) | Authenticated owner UI | Next.js app, Convex live queries | Agent-authored Markdown/Mermaid/board JSON (sanitized/validated); no raw-HTML passthrough |
| **Convex** (`*.convex.cloud` / `*.convex.site`) | Data + attachment serving | Mutations (sequencer), `/agent/*` HTTP actions, file bytes | Service-token agent writes; uploaded file bytes |
| **Content** (`content`, separate `*.vercel.app`) | Untrusted compute | The sandbox shell + whatever HTML an `html-static` artifact contains | The artifact HTML itself — assumed fully hostile |

`*.vercel.app` is on the Public Suffix List, so the app and content projects are
genuinely cross-site — **no domain purchase is required** for the origin
separation the sandbox depends on (plan §1).

## 2. Sandboxed HTML artifacts — the egress kill (plan §4/§5, Gate G5)

An `html-static` artifact is treated as **fully hostile code**. It may compute; it
must never exfiltrate, escape, or reach anything of ours. Defense is layered so no
single control is load-bearing alone.

### 2.1 Controls

1. **Opaque-origin frame.** The app embeds the shell with
   `sandbox="allow-scripts"` and nothing else (`@hermes/policy` `FRAME_SANDBOX_ATTR`,
   consumed verbatim by `HtmlArtifactHost`). No `allow-same-origin` (with
   `allow-scripts` it would let the frame strip its own sandbox), no
   `allow-popups`, `allow-top-navigation`, `allow-forms`, `allow-downloads`,
   `allow-modals`. The frame runs at an opaque origin regardless of host — there
   are no cookies/DOM/storage of ours reachable from it.
2. **Content CSP — the egress kill** (`@hermes/policy` `buildContentCsp`, emitted
   to `apps/content/vercel.json` by `gen-headers.ts`, drift-guarded by
   `headers.test.ts`):
   `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline';
   img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none';
   frame-ancestors <app-origin>`.
   - `connect-src 'none'` kills fetch / XHR / WebSocket / EventSource / sendBeacon.
   - `img-src data: blob:` kills `<img>` beacons **and** CSS `url()` backgrounds and
     `@font-face`.
   - `form-action 'none'` kills form-post exfil; `base-uri 'none'` blocks `<base>`
     retargeting; `frame-ancestors <app-origin>` lets only the app embed it.
   - Zero external origins, **no CDN allowlist** — stricter than the incumbents,
     and free at this scope.
   - `'unsafe-inline'` script is deliberate and safe **here only**: the origin is
     opaque and every exfil channel above is already closed, so an artifact can run
     inline JS to compute but has nowhere to send anything.
3. **One-way postMessage** (`@hermes/policy` `frameProtocol`, both ends). Content
   flows DOWN only (`{type:'render', html, artifactId, seq}`); the shell replies
   with whitelisted control messages UP only (`ready`/`height`/`render_error`).
   - Parent verifies **source identity** (`event.source === iframe.contentWindow`)
     — an opaque frame reports `origin === "null"`, so the origin string is useless
     for identity (`isFromShell`/`readShellMessage`).
   - Shell verifies `event.origin === APP_ORIGIN` **exactly** before rendering
     (`isFromAppOrigin`/`readRenderMessage`).
   - A message failing either check is ignored and counted as a tripwire
     (`frame_message_rejected` / host `rejectedCount`).
4. **Failure visibility.** A render error or a shell that never becomes ready is an
   explicit state showing the raw source (`HtmlArtifactHost` `render_error` /
   `unavailable`) — a blocked capability never looks like success.
5. **Focused-only mounting.** Only the focused artifact mounts a live iframe;
   history previews are click-to-activate (`HtmlPreviewActivate`).

### 2.2 Enforcement

| Control | Test / command |
|---|---|
| Zero egress across every channel (network-intercept-asserted) + no nav/popup escape | `node e2e/security/hostile-artifacts.mjs` — real Chrome, real shell, real CSP, real sentinel server |
| Sandbox attr = `allow-scripts` only; forbidden tokens absent from source | `node scripts/check-sandbox-grep.mjs` (`pnpm check:sandbox`) + `htmlFrameHost.test.ts` / policy `policy.test.ts` |
| Content CSP exact + on every path | `node e2e/security/assert-headers.mjs --local` (deployed: `--url`, F1) + `apps/content/headers.test.ts` |
| Protocol identity (parent + shell), hostile synthesized events | `packages/policy/frameProtocol.test.ts` (16) + `htmlFrameHost.test.ts` (16) |

**Standing rule (plan §10.2):** the moment an artifact needs network or
persistence it has left this tier — the answer is a hosted-elsewhere link, **not**
a CSP/sandbox relaxation. WARDEN owns that "no."

## 3. App-origin hardening (plan §4 app hardening, WP4)

`next.config.mjs` ships the app CSP (`@hermes/policy` `buildAppCsp`, via the
byte-identical `apps/web/appCsp.mjs` mirror, drift-guarded by `appCsp.test.ts`) on
every response:

- `img-src 'self' data: blob: <convex-site>` — closes the **Markdown image-beacon**
  channel app-wide (the exfil pattern that leaked ≥7 products) while still allowing
  Convex-served attachment images. External images in agent Markdown render as a
  visible broken-image state showing the URL — an exfil *attempt* becomes audit
  evidence.
- `connect-src 'self' <convex-cloud> wss://<convex-cloud> <convex-site>` — keeps the
  Convex WebSocket alive (regression-tested).
- `frame-src <content-host>` exactly — authorizes the sandbox mount and blocks a
  hostile artifact self-navigating the frame elsewhere.
- `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` +
  `X-Content-Type-Options: nosniff`.

**Markdown sanitizer** (`@hermes/policy` `MARKDOWN_SANITIZER_POLICY`, consumed by
`@hermes/render`): no raw-HTML passthrough, no event handlers, `javascript:`
stripped. **Mermaid** at `securityLevel: 'strict'`.

### 3.1 Concession: app `script-src`/`style-src` `'unsafe-inline'` (F7 posture note)

Next.js App Router injects inline bootstrap scripts and inline styles without a
nonce by default, so `'unsafe-inline'` is required for the app to run. This is a
**documented concession, not a sandbox relaxation**:

- The app origin has **no untrusted-HTML injection surface**: Markdown is sanitized
  (no raw HTML, `javascript:` stripped), external images are blocked, and there is
  no path that reflects attacker HTML into the app DOM. Inline-script XSS therefore
  has no entry point on this origin.
- It is a different risk class from the sandbox frame (§2), which is *designed* to
  run hostile inline script and contains it by opacity + `connect-src 'none'`.
- **Hardening path if the surface ever changes:** move to a nonce-based
  `script-src` (Next supports it with a middleware nonce) and drop `'unsafe-inline'`.
  Tracked as a follow-up; not required at MVP because the entry point does not exist.

Any *widening* beyond this (e.g. adding an external origin, relaxing the sandbox)
requires a new amendment here first.

## 4. Attachment serving (plan §4)

Uploaded bytes are served only through the Convex HTTP action with
`@hermes/policy` `ATTACHMENT_HEADERS`: `Content-Disposition: attachment` +
`X-Content-Type-Options: nosniff`, so an uploaded `.html`/`.svg` is downloaded,
never rendered inline (stored-XSS advisory). Enforced by `files.ts` +
`files.test.ts`; the 10 MB cap is server-side (oversize deleted, never bound).

## 5. Feature-flag kill switches (plan §8/§9)

`html_artifacts`, `boards`, `jobs_tab` gate **rendering/mounting** of the risky
surfaces, default OFF, owner-only flips (`flags.setFlag`), each flip audited as a
`flag_changed` event. A regression response is a flag flip (seconds, no redeploy) —
`runbook.md` §9. Flags do **not** gate data ingestion: an artifact written while a
flag was on stays stored (append-only) and re-renders when it returns. Prod flips
are Frank-gated (F4), one at a time, audit + smoke after each.

## 6. Prompt-injection posture (plan §7, Gate G7 fire drill)

Hermes writes only through the validated Canvas API; it never touches storage. The
server records ground truth (`resolved_action`) for every write — the agent's
self-description is never trusted as the record. A hostile attachment that
instructs Hermes to exfiltrate dead-ends at every channel:

- via an HTML artifact → §2 (no egress, attempt is an audit event);
- via Markdown image → §3 (blocked, URL shown);
- via a new external fetch → no such capability exists on either origin.

The full injection fire drill (hostile attachment → confirm every channel
dead-ends visibly + is an audit event) is a Gate G7 launch item (Frank-gated).

## 7. Residual risks / open items

| Item | Status |
|---|---|
| Deployed content-origin header assertion (`assert-headers --url`) | **F1** — pending the `content` Vercel project; local `--local` + the in-browser hostile suite stand in |
| App `'unsafe-inline'` → nonce migration | Follow-up (no entry point today; §3.1) |
| G7 prompt-injection fire drill | Frank-gated launch item |
| Convex free-tier meter under a chatty agent | Billing probes at G1/G7 + in-product usage card |
