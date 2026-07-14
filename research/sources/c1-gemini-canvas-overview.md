# Gemini Canvas — overview, edit flow & persistence (OFFICIAL + COMMUNITY)

- URLs:
  - https://gemini.google/overview/canvas/ (official product page)
  - https://blog.google/products-and-platforms/products/gemini/gemini-collaboration-features/ (official launch announcement)
  - https://support.google.com/gemini/thread/388513441 and /thread/388627459 (community: "not saved" complaints)
  - https://docs.cloud.google.com/gemini/enterprise/docs/assistant-canvas (Gemini Enterprise canvas docs)
- Source type: official (product/blog/docs) + community (support threads)
- Accessed: 2026-07-13

## Key claims
- **Unified workspace:** Canvas is one space where user + Gemini collaborate in real time on documents and code. Interface has an **Editor**, a **Preview** tab (live render of the generated page/app), and a **Code** tab (view/copy raw source).
- **Live preview:** Gemini can generate HTML/CSS/JS/React and you "instantly switch to preview mode" to see the rendered app; iterate at the prompt level and see updated previews immediately. (Rendering is via SafeContentFrame — see c1-google-safecontentframe.md.)
- **Edit/version model:** Undo/redo on the toolbar navigates "between different saved versions" within the **active session**. BUT per community/dev reports, **"each update generates a completely new Canvas artifact. The existing artifact is not modified or versioned"** — i.e., no durable cross-session version history in the way users expect.
- **Persistence problems:** Multiple Gemini Apps Community threads report canvases "not being saved" — e.g., "pasted some text, then close and reopen the module, and it was not saved." Persistence across sessions is a known pain point.

## Relevance to Hermes Canvas
- Gemini's **Editor / Preview / Code three-tab** layout is a clean pattern for exposing both the rendered artifact and its source without mode confusion.
- **The regenerate-whole-artifact-per-update model is the anti-pattern** — it breaks stable version history and is exactly what users complain about (mirrors ChatGPT's overwrite issue). Hermes should do **in-place, region-targeted edits with a persistent version chain**, not "new artifact each time."
- **Session-scoped-only persistence loses user work.** "Close and reopen, it's gone" is a trust-killer. Hermes persistence must be durable across sessions by default, with clear save state.

## Confidence
High that Canvas offers Editor/Preview/Code + live render (official). Med-high that update = new-artifact and that cross-session persistence is unreliable (dev-analysis + multiple dated community complaints; may improve over time).
