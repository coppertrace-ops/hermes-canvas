# tldraw "Make Real" — rendering LLM-generated HTML on canvas

Sources (OFFICIAL + COMMUNITY):
- Simon Willison, "tldraw/draw-a-ui", https://simonwillison.net/2023/Nov/16/tldrawdraw-a-ui/ (2023-11-16)
- GitHub tldraw/make-real, https://github.com/tldraw/make-real (repo archived 2026-02-20, read-only)
- makereal.tldraw.com (live demo)
- HN thread id=38289517 "Steve here from tldraw..." (Nov 2023)
- tldraw AI docs, https://tldraw.dev/docs/ai (updated 2026-01-31)
Accessed 2026-07-13.

## How it works (mechanism)
- User draws a rough UI mockup on the tldraw infinite canvas, selects the shapes, presses "Make Real."
- tldraw captures a **PNG image of the selection** and sends it to a vision-capable LLM (originally GPT-4 Vision; make-real later supported OpenAI, Anthropic, Google models) with a system prompt instructing it to return a single self-contained **Tailwind HTML + JS** file.
- The HTML response is placed into a **custom tldraw shape** that renders the result **inside an `<iframe>` positioned next to the original mockup** on the canvas. The generated UI is live/interactive on the canvas.
- **Iteration loop:** you can annotate the generated iframe with drawings/notes, select it all, press Make Real again. tldraw feeds the previous code plus the new annotations back into the prompt ("here's what we had before, here are the notes that came back" — steveruizok on HN). This is a key praised pattern: visual, in-place refinement.
- The system prompt is open-source (`app/lib/getHtmlFromOpenAI.ts`).

## Sandboxing / security (IMPORTANT lesson)
- Steve Ruiz (tldraw founder) on HN, Nov 2023: **"This is a toy project with a horrible security pattern, sorry."** The original draw-a-ui put the user's OpenAI API key in the browser/client — the "horrible" pattern. (COMMUNITY/official-founder admission.)
- Rendering: arbitrary LLM-generated HTML/JS runs inside an `<iframe>` on the canvas. iframes provide inherent isolation but the writeups do NOT detail explicit `sandbox=` attribute hardening — flagged as under-documented. For Hermes Canvas, embedding arbitrary generated HTML should use a sandboxed iframe (restrict `allow-scripts` without `allow-same-origin`) to prevent access to parent origin/storage.

## tldraw SDK architecture for embedding live HTML
- Per tldraw AI docs: "canvas as output" pattern uses `EmbedShapeUtil` for websites and **custom shapes** for arbitrary content; assets via `AssetRecordType`. Custom shapes can render any React/HTML, which is what Make Real uses to host the iframe.
- tldraw also ships an **Agent starter kit**: LLM reads canvas via viewport **screenshots + simplified structured shape data**, then mutates canvas via **validated action schemas** (not raw code). Relevant to Hermes agent-editing-canvas.

## Community reception
- Widely praised as a compelling demo ("a blast to play with"); commenters noted flowcharts + structural controls turn it from novelty toward useful (HN user ugh123).
- Monetization suggestions: bring-your-own-API-key, $5/mo (HN user ed).
