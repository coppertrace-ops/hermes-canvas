# Sprawl, staleness & the "junk drawer" problem on canvases/boards

Sources:
- Tembrio, "Why Feedback Boards Become Trash Cans" https://www.tembrio.com/blog/feedback-boards-become-trash-cans (COMMUNITY/vendor blog)
- Miro community threads on board bloat & performance (COMMUNITY, anecdotal)
- Miro Help: Trash overview / management (OFFICIAL — lifecycle tooling)
Accessed 2026-07-13.

## The junk-drawer pattern (moderate confidence; vendor blog + community)
- Boards "become 'junk drawers' with hundreds of posts, half of them duplicates, most of them ignored." (Tembrio, re: feedback boards generally — flagged as vendor content but describes a widely-recognized failure mode.)
- Named root causes: (1) **nobody triages** incoming items; (2) **no reply / no acknowledgment** so contributors feel ignored; (3) **duplicates pile up** and hide real signal; (4) **no statuses** — "everything looks the same," so stale and active items are indistinguishable.
- Cost: "the one place that should tell you what to build is too messy to read." Loss of trust + loss of insight.
- Prescribed fix = **lifecycle discipline**: statuses on every item, monthly scans to remove stale items, ~20 min/week maintenance. Implication: canvases have **no built-in lifecycle**, so staleness is the default state.

## Miro-specific sprawl signals (COMMUNITY, anecdotal)
- Recurring "board too big / laggy" threads correlate sprawl with the performance cliffs above — bloat and slowness are the same problem seen from two angles.
- Miro's structural answer is partitioning (split across boards) + Trash/lifecycle tooling, not automatic curation.

## Lessons for Hermes Canvas
- **Statelessness of items is the core defect**: without per-item status (fresh / stale / superseded / archived), a canvas trends toward an unreadable junk drawer. Agent-editable canvases risk this faster because agents can add content cheaply.
- Consider first-class **item lifecycle metadata** (created/updated/last-touched, status, provenance = which agent turn created it) and **staleness surfacing** (dim/flag old items, detect superseded duplicates).
- "No one triages" → an agent could *own* triage: dedupe, archive stale, summarize. This is a differentiator vs. Miro/Excalidraw which leave curation entirely manual.
- Discoverability ("hard to find things") worsens with sprawl → need search + structure (tabs/frames/links), not just infinite space.
