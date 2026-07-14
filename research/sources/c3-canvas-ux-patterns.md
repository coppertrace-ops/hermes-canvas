# Canvas interaction patterns users praise (infinite canvas, frames, pages, tabs, linking, embedding)

Sources:
- tldraw SDK feature list / README https://github.com/tldraw/tldraw ; Embed shape docs https://tldraw.dev/sdk-features/embed-shape (OFFICIAL)
- Kosmik blog (infinite-canvas PKM roundups) https://www.kosmik.app/blog (COMMUNITY/vendor)
- Storyflow "12 Best Infinite Canvas Tools 2026" (COMMUNITY roundup)
- Heptabase/Kosmik user praise (COMMUNITY)
Accessed 2026-07-13.

## Patterns users consistently praise

### Spatial organization (the core draw)
- Infinite canvas lets people "arrange content spatially, the way you'd organize papers on a physical desk" — praised as matching how the brain works "spatially and associatively" (Kosmik/Heptabase reviews). Lower learning curve than folders/docs; "feels natural from day one."
- Heptabase praised specifically for **sense-making**: turning scattered cards into coherent understanding (literature reviews, research) — extract highlights → cards on canvas.

### Frames & pages (structure inside the infinite space)
- tldraw: **Frames** (group/crop regions, like artboards) + **Pages** (reorder by dragging, inline rename, resize the list). Frames are the antidote to pure sprawl — bounded regions give structure.
- Pages/tabs = the industry's partitioning primitive (also the perf escape hatch). Multi-tab is validated by every major tool.

### Arrows, bindings & linking
- tldraw arrows **snap/bind to shapes** with arc/elbow routing into clean orthogonal paths; bindings persist the connection when shapes move. Praised for making diagrams feel "alive."
- Linking between items/canvases (backlinks, spatial references) is a recurring want in PKM canvases (Heptabase/Scrintal style).

### Embedding
- tldraw: **19 pre-configured embeds** ("secure, responsive, work out of the box"); custom shapes extend to 3D, audio players, video, interactive components via one `ShapeUtil` interface — auto-gets selection/resize/binding/export.
- Built-in browser (Kosmik) praised: pull in articles/images/PDFs without leaving canvas ("spatial research").

### Custom shapes / extensibility (developer praise)
- tldraw SDK repeatedly called "in a class of its own for embeddable canvas." `ShapeUtil` gives custom content free selection handles, resize, hit-testing, binding points, export, and render optimizations — the reason Make Real could host live HTML so easily.

## Lessons for Hermes Canvas
- **Frames + tabs are non-negotiable** structure primitives; infinite canvas alone becomes a junk drawer (see sprawl notes).
- **Bindings/linking** (arrows that stay attached; references between items and tabs) are what users love and what makes agent-generated diagrams durable.
- A clean **custom-shape abstraction** (like tldraw's ShapeUtil) is the right architecture for agent-editable heterogeneous content (text, images, live HTML, embeds).
- Embedding + in-canvas browsing is a proven delight; pairs naturally with an agent that fetches/places content.
