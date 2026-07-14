# tldraw Make Real — render AI-generated HTML in an on-canvas iframe

- Type: PRIMARY (tldraw eng blog + open-source make-real-starter) + Simon Willison
- Tag: incumbent-arch / iframe-sandbox
- Accessed: 2026-07-13
- URLs:
  - https://tldraw.dev/blog/make-real-the-story-so-far (Steve Ruiz)
  - https://github.com/tldraw/make-real-starter
  - https://tldraw.dev/sdk-features/embed-shape
  - https://simonwillison.net/2023/Nov/16/tldrawdraw-a-ui/

## How it renders untrusted generated HTML

- Model (GPT-4V) returns a full HTML document. Make Real puts it in a **tldraw
  custom shape that renders via an `<iframe srcDoc={html}>`** with
  **`sandbox="allow-scripts"`** — scripts run, but opaque origin (no same-origin).
- Because tldraw's canvas is regular HTML/DOM, iframes embed directly on the
  infinite canvas; you can resize the iframe to test responsive breakpoints and
  arrange iterations side by side.
- Iteration loop: annotate the rendered iframe, select, "Make Real" again; the
  previous HTML is fed back to the model to "fill in" changes.

## Sandbox posture for arbitrary/pasted embeds

tldraw docs: iframes pasted directly (arbitrary source) "receive a **stricter
sandbox** than built-in providers (**no allow-same-origin, no top navigation**),
since tldraw can't make any safety guarantees about the source." Confirms the
design rule: untrusted source ⇒ deny allow-same-origin + deny top-navigation.

## Relevance to Hermes Canvas

Second independent incumbent (after Claude Artifacts) using the SAME cheap
primitive — `srcDoc` + `sandbox="allow-scripts"`, no same-origin — to render
untrusted AI HTML, directly ON a canvas. Strong precedent that the pattern Hermes
needs is proven and lightweight (client-only). Note: srcDoc on the SAME origin
gives an opaque origin via sandbox, but a dedicated separate origin is stronger
defense-in-depth (see claudeusercontent.com). Evidence FOR Fable #2 (cheap+safe,
canvas-native).
- Confidence: HIGH (primary eng blog + OSS code + Simon Willison corroboration).
