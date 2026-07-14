# Steve Ruiz (tldraw founder) — "The Accidental AI Canvas" (Latent.Space)

Source: Latent.Space podcast/essay, "The Accidental AI Canvas — with Steve Ruiz of tldraw", https://www.latent.space/p/tldraw (OFFICIAL — founder interview). Accessed 2026-07-13. Make Real went viral Nov 2023.

## How Make Real renders LLM HTML (founder's account)
- tldraw sends a **photo (screenshot) of the wireframe** to GPT-4V "which kind of looks the same as if you had done a copy-and-paste," PLUS **all the text items sent separately** because the vision model "is not really great with recognizing text" (OCR limits). Lesson: don't rely on the model to OCR your canvas — pass structured text alongside the image.
- The model returns a **single self-contained HTML file**, which tldraw **embeds in an iframe on the canvas** to interact with alongside the sketch.

## Canvas AS the AI interface (thesis)
- Ruiz deliberately did NOT turn Make Real into a standalone SaaS. His thesis: the durable innovation is **the canvas itself** — "web-based, hackable, extendable, super refined interactions" — as a **spatial surface for multimodal prompting and iteration**. Strong validation of the Hermes Canvas premise (chat + canvas as an AI workspace).

## Iteration is the whole game (key lesson)
- **"You're never going to put all the information in the first time — you need to be able to iterate on it."**
- The loop: annotate a generated result with arrows/text/screenshots, then resubmit the modified image as the new prompt. The canvas makes the iterate-and-refine loop spatial and natural. This is the single most important UX insight for an agent-editable canvas.

## Technical choices / what worked / failed
- Chose **React components over HTML `<canvas>` rendering** so shapes can be interactive widgets without custom graphics programming — unusual for design tools but what makes live embedded HTML/iframes feasible. (Trade-off: React-per-shape has performance limits at high object counts — ties to perf-cliff notes.)
- Worked: sending text separately (OCR workaround); open-source + clear license; platform-not-point-solution positioning; the annotate→resubmit loop.
- Failed/weak: with drawings-but-no-text-labels, models "over-focus on visual UI without behavioral logic"; **consistency across iterative generations is imperfect** (regenerating can drift/lose prior work).
- Reach: ~22M views in 30 days after Nov 2023 virality.

## Lessons for Hermes Canvas
- Feed the agent BOTH a rendered image of the canvas AND structured text/shape data (mirrors tldraw's Agent starter kit: screenshot + simplified shape data).
- Make the annotate→regenerate loop first-class; expect imperfect consistency, so preserve prior versions (see versioning notes) and let users diff/revert.
- React-component shapes are ergonomic but watch object-count performance.
