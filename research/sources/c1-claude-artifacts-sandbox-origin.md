# Claude Artifacts — sandbox origin, iframe & CSP (COMMUNITY/TECHNICAL synthesis)

- URLs:
  - https://www.reidbarber.com/blog/reverse-engineering-claude-artifacts (community reverse-engineering, dated **2024-06-23**)
  - Synthesis from multiple 2026 technical guides (display.dev, digitalapplied.com, gptprompts.ai) surfaced via search
- Source type: community / technical reverse-engineering (not official)
- Accessed: 2026-07-13

## Key claims
- **Separate origin.** Artifacts render inside a sandboxed iframe served from `*.claudeusercontent.com` (Reid Barber identifies `https://www.claudeusercontent.com`, a **Next.js** app) — a distinct origin from the main `claude.ai` session. This is the crux of the isolation: browsers already enforce strong cross-origin boundaries, so Anthropic leans on that rather than a custom sandbox.
- **postMessage content transfer.** Compiled code is passed from the chat thread into the preview iframe via `window.postMessage()`. There is a parent↔iframe handshake; origin mismatches in that handshake are a known failure mode (see GitHub issue #42064 re: `app://localhost` postMessage origin mismatch on published artifacts, and claude-ai-mcp issue #40 re: hardcoded `frame-src`).
- **Strict CSP.** Community guides consistently report artifacts are served "under a strict Content Security Policy that blocks external scripts, fonts, and network requests" — no third-party scripts/fonts/stylesheets/images, and `fetch`, `XHR`, and `WebSocket` are blocked. Payload capped ~16 MiB per artifact.
- **Bundled runtime.** The iframe pre-includes React DOM, Tailwind, DOMPurify, Radix Primitives, Lucide, and a **React Runner** library for dynamic component execution — so artifacts don't fetch dependencies at runtime.

## Relevance to Hermes Canvas
- The **separate-origin iframe + strict CSP + postMessage bridge** is the canonical incumbent pattern for rendering untrusted agent HTML/JS. Hermes should host canvas content on a **distinct origin** (not the app origin), block network egress by default via CSP, and pass content in over postMessage.
- Pre-bundling a fixed runtime (React, Tailwind, sanitizer) avoids runtime network fetches — this is how you keep CSP strict while still rendering rich components.
- The postMessage-origin-mismatch bugs are a concrete pitfall: the handshake must pin exact expected origins on both sides.

## Confidence
Med-high. The origin (`claudeusercontent.com`), iframe, and CSP-blocks-network claims are corroborated across several independent sources and match Anthropic's stated "use browser primitives" philosophy. Exact `sandbox="..."` attribute string and full CSP header text were NOT recovered (code is minified). Treat specific values as reverse-engineered, not official.
