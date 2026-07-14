# Versioning / history in canvas & design tools; how changes are shown

Sources:
- Figma Help: "View a file's version history" https://help.figma.com/hc/en-us/articles/360038006754 (OFFICIAL)
- Figma "Guide to branching" https://help.figma.com/hc/en-us/articles/360063144053 (OFFICIAL)
- Figma forum feature request: version-history diff/highlight who-did-what https://forum.figma.com/suggest-a-feature-11/...29508 (COMMUNITY)
- Miro (community references to "highlight areas changed since last visit")
Accessed 2026-07-13.

## Figma (OFFICIAL)
- **Auto-checkpoints:** Figma records a version-history checkpoint roughly **every 30 minutes**, plus named versions users create manually.
- **Timeline view:** full version list from creation → now; restore/duplicate any version.
- **Branching:** branches are "exploratory spaces" to try ideas without touching main; **merge back** when ready. Can **compare a branch vs. main, highlighting differences** (Git-like model for design). Available on higher tiers.
- **Gap (COMMUNITY):** Users request per-change *visual diffs* and "who changed what / highlight what changed since last visit" — Figma's timeline shows versions but not a granular visual diff by default. It's a longstanding feature request.

## Miro
- Miro has surfaced "highlight areas that were changed since the last visit," which Figma users envy — i.e., **change-since-last-seen** highlighting is a valued pattern for large boards.

## tldraw
- SDK is CRDT-ish/reactive record store with real-time multiplayer; history = undo/redo stack rather than a rich named-version timeline out of the box. (Versioning is app-developer's responsibility.)

## Lessons for Hermes Canvas
- **"What changed since I last looked" is the killer feature** for collaborative/agent-edited canvases — more valued than a raw version timeline. When an agent edits the canvas, users need to see *exactly what the agent touched*, ideally highlighted.
- Provenance matters: attribute each change to a user or a specific agent turn (who/when/why). Combine with the lifecycle metadata from the sprawl notes.
- Time-based auto-checkpoints (Figma's 30-min model) are a proven baseline; but agent turns are natural, semantically meaningful checkpoint boundaries — checkpoint per agent action so edits are reviewable/revertible.
- Branching (safe exploration + merge/diff) is a strong model for "let the agent try something without wrecking the main canvas."
