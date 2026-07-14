# Cloudflare Workers / Sandbox SDK — server-side isolation model

- Type: PRIMARY (Cloudflare docs) + secondary (Joshua Rogers one-way iframe)
- Tag: incumbent-arch / cheap-safe
- Accessed: 2026-07-13
- URLs:
  - https://developers.cloudflare.com/workers/reference/security-model/
  - https://developers.cloudflare.com/sandbox/concepts/security/
  - https://blog.cloudflare.com/safe-in-the-sandbox-security-hardening-for-cloudflare-workers/
  - https://joshua.hu/rendering-sandboxing-arbitrary-html-content-iframe-interacting

## Cloudflare Workers isolation (server-side)

- Workers run code inside **V8 isolates** (Google's JS engine): "execute code
  inside isolates that prevent that code from accessing memory outside the isolate —
  even within the same process."
- Process-level defense in depth: "another layer of sandboxing using **Linux
  namespaces and seccomp** to prohibit all access to the filesystem and network."
- **Cloudflare Sandboxes** product: container/microVM-style "secure code execution"
  for running untrusted / AI-generated code with preview URLs (heavier tier, for
  EXECUTION not just render).

## Browser-side one-way sandbox pattern (Joshua Rogers)

For rendering arbitrary untrusted HTML in the browser: put it in an iframe so
"the framed content won't have access to your page's DOM, or data you've stored
locally." With `sandbox=allow-scripts` the frame is cross-origin/opaque so the
PARENT also can't read INTO it after creation — you deliberately use `postMessage`
(one-way) to seed content, giving a "read-only" iframe the parent can write to but
the child can't read back from. Matches Claude Artifacts / tldraw transport.

## Two tiers, clearly separated

- RENDER agent HTML in browser → iframe opaque-origin + CSP (cheap, no server).
- EXECUTE agent code server-side → V8 isolate / microVM / namespaces+seccomp
  (Cloudflare Workers/Sandbox, Vercel Sandbox, e2b) — heavier.

## Relevance to Hermes Canvas

Confirms the same two-tier split seen across incumbents. Hermes's render-only
requirement lands in the cheap browser tier; the Cloudflare/V8 machinery is only
needed if agents execute server code. Reinforces Fable #2's "cheap is possible"
under a render-only scope.
- Confidence: HIGH for Cloudflare model (primary docs); MEDIUM for one-way iframe
  pattern (well-regarded individual write-up).
