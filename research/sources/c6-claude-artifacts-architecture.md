# How Claude Artifacts renders untrusted generated HTML (incumbent architecture)

- Type: SECONDARY (reverse-engineering write-up) + community
- Tag: incumbent-arch
- Accessed: 2026-07-13
- URLs:
  - https://www.reidbarber.com/blog/reverse-engineering-claude-artifacts (Reid Barber)
  - Anthropic system prompt refs (CDN allowlist)

## Key architecture (from Reid Barber reverse-engineering + corroboration)

- Preview runs in an **iframe from a SEPARATE domain: `https://www.claudeusercontent.com`**
  (NOT claude.ai). This is a distinct registrable origin so the artifact cannot
  reach claude.ai cookies/session even if it runs script.
- Communication is via **`window.postMessage()`** — parent posts the code to
  render into the iframe; the iframe is a Next.js app that renders it. Cross-origin
  handshake uses the claudeusercontent.com origin (postMessage origin checks).
- Code delivered inline (srcdoc-style) or via a media/content endpoint served with
  `Content-Security-Policy: sandbox allow-scripts` (the CSP *sandbox* directive,
  equivalent to the iframe sandbox attribute — gives opaque/null origin + scripts).
- With sandbox lacking `allow-same-origin`, the iframe has a **null origin** and
  cannot access parent cookies, localStorage, or DOM (corroborated across write-ups).
- **External scripts restricted to a CDN allowlist**: Anthropic's HTML-artifact
  system prompt instructs use of `https://cdnjs.cloudflare.com` (and popular CDNs
  like Chart.js, D3, Tailwind CDN, Google Fonts are reachable). React artifacts use
  DOMPurify + React Runner / react-hot-loader for dynamic rendering.

## Corroborating detail (GitHub issue #42064, anthropics/claude-code)

Published-artifact blank-screen bug traced to a **postMessage origin mismatch**
(`app://localhost`) — confirms origin-scoped postMessage is the real transport and
that origin identity is load-bearing in the design.

## Relevance to Hermes Canvas

Direct precedent: the biggest AI-artifact incumbent isolates agent HTML on a
DEDICATED sibling origin (claudeusercontent.com), sandbox=allow-scripts (no
same-origin), postMessage bridge, CDN allowlist. This is exactly the "separate
static origin + iframe" model and validates it as production-viable (Fable #2 pro).
- Confidence: MEDIUM-HIGH (reverse-engineered, not official docs; multiple
  independent write-ups agree on the separate-origin + sandbox=allow-scripts core).
