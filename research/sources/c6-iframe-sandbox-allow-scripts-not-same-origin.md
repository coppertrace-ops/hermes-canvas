# iframe sandbox — allow-scripts WITHOUT allow-same-origin (the load-bearing combo)

- Type: PRIMARY/AUTHORITATIVE (MDN Web Docs, W3C HTML spec, WHATWG validator rule)
- Tag: iframe-sandbox
- Accessed: 2026-07-13
- URLs:
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox
  - https://rocketvalidator.com/html-validation/... (W3C validator message)

## The rule (verbatim, MDN + validator)

An empty `sandbox=""` attribute applies ALL restrictions. Each token re-enables
one capability. The critical combination:

> "When the embedded document has the same origin as the embedding page, it is
> strongly discouraged to use both `allow-scripts` and `allow-same-origin`, as
> that lets the embedded document remove the `sandbox` attribute — making it no
> more secure than not using the `sandbox` attribute at all."  — MDN

W3C/WHATWG validator emits: *"Setting both 'allow-scripts' and 'allow-same-origin'
is not recommended, because it effectively enables an embedded page to break out
of all sandboxing."*

## Why allow-scripts alone is safe

- `allow-scripts` lets the iframe run JS.
- WITHOUT `allow-same-origin`, the browser forces the iframe into a **unique
  opaque origin** ("null" origin). Consequences:
  - Cannot read/write parent DOM, cannot reach parent cookies/localStorage.
  - `document.cookie`, `localStorage`, `sessionStorage`, IndexedDB access throws
    or is partitioned to the opaque origin (no app-origin secrets reachable).
  - Cannot script-remove its own `sandbox` attribute to escalate (the element
    lives in the parent DOM which it can't touch).
- WITH both: iframe keeps the app's real origin AND can run script, so it can
  reach `window.parent` (same-origin), rewrite its own iframe element's sandbox,
  and read the app's storage/cookies → full breakout. Equivalent to no sandbox.

## Practical pattern for agent HTML

`<iframe sandbox="allow-scripts" srcdoc="...agent html...">`  → JS runs, but
opaque origin. To also block top-navigation hijack keep OFF `allow-top-navigation`.
Add `allow-forms`/`allow-popups` only if needed. Do NOT add `allow-same-origin`.

## Relevance to Hermes Canvas

Confirms the core boundary: agent HTML in `sandbox="allow-scripts"` (no
same-origin) on a SEPARATE origin cannot touch the app's session/cookies even if
malicious. This is the cheap primitive underpinning Fable claim #2.
- Confidence: HIGH (MDN + W3C spec + validator all agree).
