# Rendering arbitrary / LLM-generated HTML safely inside a canvas

Sources (technical/security — high confidence, standards-based):
- MDN <iframe> reference https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe (OFFICIAL/standards)
- web.dev "Play safely in sandboxed IFrames" https://web.dev/articles/sandboxed-iframes (OFFICIAL/Google)
- Joshua Rogers, "One-Way Sandboxed Iframes" https://joshua.hu/rendering-sandboxing-arbitrary-html-content-iframe-interacting (COMMUNITY, expert)
- Mozilla bug 1589845 (sandbox bypass via javascript: + window.opener)
- tldraw Make Real (the applied case; founder called original a "horrible security pattern")
Accessed 2026-07-13.

## The cardinal rule
- **NEVER combine `sandbox="allow-scripts allow-same-origin"` for untrusted content.** Together they let the framed document *remove its own sandbox attribute* — "no more secure than not using sandbox at all" (MDN). LLM-generated HTML/JS must run WITHOUT `allow-same-origin`, so it is treated as a **unique/opaque origin** and cannot touch parent DOM, cookies, or localStorage.
- Consequence: with `allow-scripts` (no same-origin) the parent canvas **cannot read the iframe's DOM either** — the isolation is bidirectional. Communication must go through **`postMessage`**.

## Defense in depth
1. **Serve embedded content from a separate origin** (dedicated sandbox domain / null origin via `srcdoc`). "Sandboxing is useless if the attacker can display content outside a sandboxed iframe."
2. **Content Security Policy (CSP)** on the framed doc to restrict what it can load/exfiltrate (block network, inline eval scope, etc.).
3. **Minimize sandbox tokens** — each token (allow-forms, allow-popups, allow-modals, allow-top-navigation) relaxes isolation deliberately.
4. **Known bypasses to block:** sandboxed iframes can still escape via `javascript:` links + `target="_blank"` + `window.opener` (Mozilla bug 1589845). Omit `allow-top-navigation`/`allow-popups` and set `rel="noopener"` semantics; consider stripping/sanitizing links.
5. Use `postMessage` (with strict origin checks) for any host↔iframe data exchange.

## Applied lesson from tldraw Make Real
- Make Real renders generated HTML in an on-canvas iframe (custom shape). Founder publicly labeled the *original* draw-a-ui a "horrible security pattern" — the flaw was primarily the **client-side API key**, but it underscores that shipping LLM-generated HTML naively is risky.
- For Hermes Canvas: treat every agent/LLM-generated HTML block as untrusted. Render via sandboxed cross-origin iframe (`srcdoc` or separate origin, `allow-scripts` only), CSP, postMessage bridge. Do NOT give it same-origin or the app's credentials.

## Performance caveat
- Each live iframe is a full document → heavy. Combined with canvas performance cliffs, a board full of live generated iframes will hit limits fast. Consider rendering static previews (screenshot/thumbnail) and only "activating" the live iframe on focus.
