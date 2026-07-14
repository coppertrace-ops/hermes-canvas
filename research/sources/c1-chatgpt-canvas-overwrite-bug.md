# OpenAI Community — "Canvas Overwrites Work Without Warning" (COMMUNITY / BUG)

- URL: https://community.openai.com/t/canvas-overwrites-work-without-warning-major-issue-for-creators/1231713
- Source type: community bug thread (OpenAI Developer Community)
- Accessed: 2026-07-13. Thread runs **2025-04-18 → 2025-08-24**, 17+ responses across desktop/web/mobile.

## Key claims
- **Silent destructive overwrite:** Canvas "creates a new blank one and replaces the original without warning" (OP, 2025-04-18). Users requesting a targeted edit report ChatGPT overwriting unrelated canvas content instead.
- **Save/restore failures:** A user "edited Canvases, told ChatGPT to save, and then later reopened the file only to find an older version restored" (2025-04-18).
- **Version history removed / truncation:** "Documents exceeding ~8k–10k tokens are at risk of silent truncation" and "version history has been removed without notice" (2025-05-12).
- **Scale of loss:** one user lost "15 hours" of work in a single incident (May 17); another lost "several weeks of planning work" (May 24).
- **Workaround:** users resort to explicit verbatim-preservation instructions ("all of my (User's) wording is to be preserved VERBATIM").

## Relevance to Hermes Canvas
- **The version model must be trustworthy or it's worse than nothing.** A restore that silently returns the wrong version, or history that "disappears," destroys trust faster than having no history. Hermes' versioning must be durable, visible, and never silently truncate.
- **Agent edits must be scoped and confirmable.** The core failure is the agent overwriting content the user didn't ask it to touch. Hermes should scope agent edits to a target region and show a diff before commit, so the agent can't blow away the whole canvas.
- **Long-doc truncation** at ~8–10k tokens is a concrete failure mode: canvases that exceed the model's working window get silently clipped. Hermes needs a strategy for large canvases (chunking, region-targeted edits) rather than round-tripping the whole doc through the model.

## Confidence
High that these complaints exist and recur (many corroborating users, dated posts). The exact technical cause (token truncation vs UI bug) is user-inferred, med-confidence.
