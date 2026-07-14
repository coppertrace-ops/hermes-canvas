# web.dev — "Play safely in sandboxed IFrames" (authoritative Google guidance)

- Type: PRIMARY/AUTHORITATIVE (web.dev / Google, Mike West)
- Tag: iframe-sandbox
- Accessed: 2026-07-13
- URL: https://web.dev/articles/sandboxed-iframes

## Core principle (verbatim)

"grant content we embed only the minimum level of capability necessary to do its
job." Empty `sandbox` = all restrictions; add tokens back one at a time.

## The breakout warning (verbatim)

"if a page on `https://example.com/` frames another page on the same origin with a
sandbox that includes both the **allow-same-origin** and **allow-scripts** flags,
then the framed page can reach up into the parent, and remove the sandbox attribute
entirely."

→ Same-origin + scripts = the iframe can delete its own sandbox and fully escape.
So for UNTRUSTED content you must NOT grant allow-same-origin alongside
allow-scripts. (Their Twitter-widget example grants both only because Twitter is
TRUSTED first-party-ish content — not the untrusted-agent case.)

## Implication for untrusted agent HTML

- Untrusted agent code: `sandbox="allow-scripts"` only (opaque origin), never
  `allow-same-origin`. Add `allow-forms`/`allow-popups` only if genuinely needed;
  never `allow-top-navigation`.
- web.dev notes sandbox=allow-scripts makes the frame cross-origin/opaque, so the
  parent can't script into it — use `postMessage` for the parent↔iframe channel.

## Note / gap

This specific article focuses on the sandbox ATTRIBUTE and does not itself spell
out the "serve untrusted content from a separate registrable DOMAIN" defense — that
comes from the origin-isolation literature (GitHub usercontent, Nextcloud) and
Claude's claudeusercontent.com. Combine both: opaque-origin sandbox AND a distinct
domain for defense in depth.

## Relevance to Hermes Canvas

Google's own guidance confirms the exact attribute posture Hermes should use for
agent HTML, and names the specific same-origin+scripts breakout to avoid.
- Confidence: HIGH (primary Google/web.dev).
