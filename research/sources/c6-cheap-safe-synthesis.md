# Cheap + safe sandbox for agent HTML — synthesis (Fable claim #2 verdict)

- Type: SYNTHESIS across primary sources in this cluster
- Tag: cheap-safe
- Accessed: 2026-07-13
- Draws on: c6-iframe-sandbox-*, c6-claude-artifacts-*, c6-tldraw-make-real,
  c6-csp-block-egress, c6-webdev-sandboxed-iframes, c6-untrusted-attachments,
  c6-markdown-image-exfil-incidents, c6-echoleak-*, c6-server-vm-sandboxes-*

## The question

Fable claim #2: "agent HTML can be rendered safely AND cheaply." Does rendering
untrusted agent HTML require heavy server VMs, or is a static separate-origin
iframe enough?

## Evidence FOR cheap (render-only path)

- Browser primitive already contains client JS: `<iframe sandbox="allow-scripts">`
  (no allow-same-origin) forces an **opaque/null origin** → agent JS cannot read
  app cookies, localStorage, or DOM (MDN, web.dev, HTML spec).
- Two major incumbents ship exactly this cheaply: **Claude Artifacts** (dedicated
  `claudeusercontent.com` origin + `CSP: sandbox allow-scripts` + postMessage) and
  **tldraw Make Real** (`srcDoc` + `sandbox="allow-scripts"`, on-canvas). No
  per-render VM.
- Egress exfil (the residual risk after origin isolation) is closed with STATIC
  headers, not compute: `default-src 'none'; connect-src 'none'; img-src 'none'`
  (or data:). No server sandbox required to enforce these — just a header on a
  static content origin (Cloudflare Pages / R2 / S3+CloudFront style).
- Serving from a **separate registrable domain** (githubusercontent-style) +
  `Content-Disposition`/`nosniff` for downloads is also static config.

## When you DO need the expensive tier

Server VMs (Vercel Sandbox / e2b / Cloudflare Sandbox / Val Town Deno subprocess /
Firecracker) are required only to EXECUTE code with server resources: filesystem,
package installs, outbound network with credentials, long compute. That is a
DIFFERENT requirement than rendering HTML in the user's browser.

## Residual risks even on the cheap path (must be handled)

- Egress/exfil via `<img>`/fetch/DNS-in-tools → mandatory strict CSP; allowlists
  are dangerous (EchoLeak, ChatGPT Azure-bucket bypass). Prefer `'none'`.
- If artifacts need real network (call your API), that reintroduces an egress leg —
  scope it to a single audited endpoint, never `*`.
- postMessage bridge must verify origin on both ends (see Claude bug #42064).

## Verdict

Fable claim #2 is SUPPORTED for a **render-only** scope: safe + cheap is achievable
with a static separate-origin sandboxed iframe + strict CSP, matching what Claude
Artifacts and tldraw already ship. It becomes FALSE/expensive only if "render" is
allowed to mean "execute arbitrary code with server-side resources," which pulls in
the microVM tier. The cheap claim is scope-dependent, and the scope Hermes states
(render agent HTML in the user's browser) is the cheap one.
- Confidence: HIGH that cheap+safe render-only is real; caveat = scope discipline.
