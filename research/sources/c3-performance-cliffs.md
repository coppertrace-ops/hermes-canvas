# Canvas performance cliffs & object-count limits (Miro, Excalidraw, Figma, tldraw)

Sources:
- Miro Help "Board performance and loading issues" https://help.miro.com/hc/en-us/articles/360013588560 (OFFICIAL)
- Miro community threads (COMMUNITY, anecdotal)
- Excalidraw GH issues #628 (2020-01-30), #7237, #7280, #8136 (COMMUNITY/dev)
- Figma "Improving Performance in the Layers Panel" https://www.figma.com/blog/improving-performance-in-the-layers-panel/ (OFFICIAL)
- Figma forum threads (COMMUNITY)
Accessed 2026-07-13.

## Miro (OFFICIAL numbers — strong confidence)
- Performance **can degrade starting at ~1,000 objects**.
- Miro **recommends staying under 5,000 objects** per board for a good experience.
- **Hard max: 100,000 objects** per board.
- Object *type* matters more than count: a few large images/PDFs hurt far more than many sticky notes. High-res images, PDFs, and vector pen drawings are "harder to render."
- Collaboration multiplies load: number of concurrent active users + weak devices degrade performance.
- Miro's own remedy: delete heavy content, convert PDFs/images to PNG/JPG, **split content across multiple boards**. (i.e., their answer to sprawl is more boards.)

## Excalidraw (COMMUNITY/dev — moderate confidence, anecdotal thresholds)
- Long-standing issue #628 (opened 2020): slowdown as elements scale (256 → 1,024 → 4,096); maintainers asked "shall we have some max limit?"
- Later reports (#7237/#7280/#8136): drawings of **4k–8k objects "perform quite well," but past ~8k it struggles**; UI becomes unresponsive; pan/zoom/edit lag; ~4–5k elements makes scrolling "almost impossible" in note-heavy use.
- Suggested (not fully shipped) fixes: **spatial indexing**, web-worker parallelism. Key architectural lesson: naive full-canvas redraw on every frame is the bottleneck — need viewport culling / spatial index.

## Figma (OFFICIAL + COMMUNITY)
- "Common to see files with tens of thousands of layers." Slowness concentrated in: hidden layers held in memory, large component sets (publishing includes all variants), stacked masks/shadows/blurs, oversized imported images.
- Figma shipped layers-panel optimizations: expand/collapse + visibility/lock toggles **30–50% faster** on largest files. Confirms the layer/scene tree itself is a scaling bottleneck, not just render.
- Multiplayer amplifies: "slow and freezing when multiple people on file."

## Cross-cutting lessons for Hermes Canvas
- Expect a **usable ceiling in the low thousands of objects** for naive canvas rendering; design viewport culling + spatial indexing early.
- Embedded heavy content (images, PDFs, live iframes) is disproportionately expensive — a canvas of live LLM-generated iframes could hit performance cliffs at very low object counts (each iframe is a full document).
- Multi-tab/multi-board partitioning is the industry's de-facto scaling escape hatch.
