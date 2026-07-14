# Devin (Cognition) — interactive planning (2.0) + Devin Review diff legibility

- Type: OFFICIAL (Cognition blog/docs) + COMMUNITY review
- Accessed: 2026-07-13
- URLs:
  - https://cognition.com/blog/devin-review (OFFICIAL, launched 2026-01-21)
  - https://cognition.ai/blog/testing-development (OFFICIAL — test plans)
  - https://aiagentsquare.com/agents/devin (review — Devin 2.0 interactive planning)
  - https://www.gartner.com/reviews/product/devin-ai-568760006 (peer reviews)

## Devin 2.0 — interactive planning (legibility before execution)
- Devin 2.0 (April 2025) does proactive codebase exploration and generates a
  detailed **execution plan the user can edit or approve before task start**
  ("interactive planning"). Same read-plan-then-approve gate as Claude Code
  Plan Mode / OpenHands Planning Mode / Windsurf.

## Devin "off-track" mitigation via written plans
- In test mode Devin first **writes a test plan grounded in source** (not
  assumptions) because early versions "very commonly went off track":
  over-testing unrelated areas, getting lost in setup, missing the core
  behavior of the PR. The written, source-grounded plan is the legibility fix.

## Devin Review — making agent-authored diffs auditable (KEY)
- Purpose: "scale human understanding of ever-more-complex code diffs —
  whether authored by a human or an agent." Cognition uses it on every PR.
- Mechanisms:
  1. **Logical diff organization**: groups logically-connected changes and
     orders hunks (vs GitHub's alphabetical), then **explains each hunk** so
     reviewers proceed sequentially — "like a knowledgeable colleague."
  2. **Inline "Ask Devin"** session with full-codebase context, threaded, in
     the review UI.
  3. **AI bug detection** with severity coloring: red = probable bug,
     yellow = warning, gray = info.
- Launched 2026-01-21, free early release; works on public+private repos;
  accessible via app, github.com→devinreview.com URL swap, or CLI.

## Relevance to Hermes Canvas
- Devin Review is the clearest market signal that **raw diffs don't scale for
  agent output** — the differentiated value is *reorganizing + explaining*
  diffs and surfacing likely bugs, i.e. exactly "make agent work legible/
  auditable." Strong validation of Hermes thesis; also a direct competitor
  on the review surface.
- Confidence: HIGH for Devin Review mechanics (official + review); MEDIUM for
  2.0 planning details (review sources).
