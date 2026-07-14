# Google — SafeContentFrame: rendering untrusted web content (OFFICIAL / SECURITY)

- URL: https://bughunters.google.com/blog/beyond-sandbox-domains-rendering-untrusted-web-content-with-safecontentframe
- Source type: official Google security engineering blog (Google Bug Hunters)
- Accessed: 2026-07-13. NOTE: direct WebFetch repeatedly returned the wrong article (page is JS-rendered); details below are from WebSearch extraction of this URL and should be re-verified against the live page. Publication date not confirmed.

## Key claims (from search extraction)
- SafeContentFrame is Google's framework for rendering untrusted content; **Gemini Canvas** uses it to preview/render user- and AI-generated mini-apps.
- **Unique per-instance origin.** The JS library creates an iframe pointing at a shim on a unique URL under `*.scf.usercontent.goog`. Default form: `https://<hash>-h<version>.scf.usercontent.goog/<product>/shim.html?origin=<parent_origin>`. Every file gets its own hash-derived origin → per-content origin isolation (stronger than a single shared sandbox domain).
- **postMessage + integrity verification.** The library sends content to the shim via `postMessage`. The shim performs **Origin Verification** (the message must come from the expected parent origin) and **Hash Verification** (recompute the hash to verify payload integrity and sender identity) before rendering.
- **Blob-URL rendering.** If checks pass, the shim (running on the unique origin) creates a `Blob` from the received content and navigates the iframe to the `blob:` URL.

## Relevance to Hermes Canvas
- Google's model goes a step beyond Claude's single `claudeusercontent.com` sandbox: a **unique hash-derived origin per artifact** means two artifacts can't reach each other even via same-origin tricks — a strong answer to multi-canvas / cross-artifact isolation.
- **Hash + origin verification on the postMessage handshake** is the fix for the exact class of bug Claude hit (postMessage origin mismatch). Hermes should verify both sender origin AND a content hash before rendering.
- **blob: URL navigation** on the isolated origin is a clean way to load agent HTML without it ever touching the parent origin or the network.

## Confidence
Med. The mechanism (scf.usercontent.goog, per-hash origin, postMessage+hash verify, blob URL) is described in detail and is consistent with Google's known "SafeFrame"/sandbox-domain lineage, but was captured via search summary rather than a clean fetch — verify exact strings and date against the live page before quoting.
