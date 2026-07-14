# The verification burden — rubber-stamping agent diffs (COMMUNITY + essay)

- Type: COMMUNITY (Hacker News) + practitioner essay
- Accessed: 2026-07-13
- URLs:
  - https://news.ycombinator.com/item?id=47234917 — HN "When AI writes the
    software, who verifies it?"
  - https://www.seangoedecke.com/ai-agents-and-code-review/ (2025-09-20)

## HN thread — "who verifies it?" (do people actually READ the diffs?)
- Central theme: AI generates code faster than humans can review, so humans
  approve without scrutiny. Direct admissions:
  - "LLMs are producing so much code that humans are just rubber stamping all
    of it. Off to merge and build it goes."
  - "I've quietly stopped being all that careful with reviews" (volume).
  - 100%-coverage mandate backfired: "everyone just uses AI to generate
    10,000 line files of unit tests and nobody can verify anything."
- Loss of understanding: reviewers approve code they don't fully grasp; e.g.
  a good-looking comment form that silently lacks CSRF protection.
- **Consensus**: current verification practices are inadequate at AI scale.
  **Disagreement**: whether formal methods vs business incentives are the fix.
- Incentive framing: "people do what they're incentivized to do... if no one
  cares about anything but shipping the next feature, that's what they focus on."

## Sean Goedecke — "If you're good at code review, you're good at AI agents"
- Thesis: code-review skill IS the skill for using agents; LLMs pursue
  architectural dead ends / over-engineering that only structural review catches.
- Uses "fairly close supervision," catches a problematic agent decision
  ~once per hour. Bad designs compound: "trying to make a badly-designed
  solution work costs time, tokens, and codebase complexity."
- **Rubber-stamp reviewers "put too much trust in the AI tooling"** — works
  with competent colleagues, fails entirely with agents.
- Best review is **structural** (is the approach right?), not line-level nits.

## Relevance to Hermes Canvas
- This is the demand-side evidence for the whole thesis: the bottleneck isn't
  generation, it's *human comprehension of what changed and why*. People
  demonstrably DON'T read large intermediate artifacts — they rubber-stamp.
- Design implication: legibility must LOWER review cost (structural summaries,
  "why", grouped/ordered changes, flagged risks) rather than dump more output.
  Volume-of-transparency is counterproductive; curated legibility wins.
- Confidence: HIGH (widely-echoed sentiment; HN is anecdotal but many
  concurring voices + a named practitioner essay).
