# GitHub Copilot agent/coding-agent — review surface + trust complaints

- Type: OFFICIAL changelog/docs + COMMUNITY (GitHub Discussions, reviews)
- Accessed: 2026-07-13
- URLs:
  - https://github.blog/changelog/2026-06-18-copilot-code-review-agents-md-support-and-ui-improvements/ (OFFICIAL)
  - https://github.blog/changelog/2026-05-19-easily-apply-copilot-code-review-feedback-with-copilot-cloud-agent/ (OFFICIAL)
  - https://docs.github.com/copilot/using-github-copilot/code-review/using-copilot-code-review (OFFICIAL)
  - https://github.com/orgs/community/discussions/170528 ("Coding Agent feedback")
  - https://github.com/orgs/community/discussions/198015 (credits/trust)
  - https://dev.to/mvm/github-copilots-pricing-changes... (trust essay)
  - https://www.nxcode.io/resources/news/github-copilot-getting-worse-2026-developers-switching

## Legibility / review model
- Copilot's **coding agent** works asynchronously and delivers results as a
  **pull request** — the PR *is* the review surface (diffs, checks, comments),
  fitting existing GitHub review muscle memory.
- Copilot **code review** now supports repo-level **AGENTS.md** so reviews
  reflect repo conventions; UI improvements shipped 2026-06-18. A cloud agent
  can auto-apply review feedback (2026-05-19).
- Immediate acknowledgement (emoji reaction on issue assignment) reassures
  users "it's listening" (small legibility touch, noted positively).

## Complaints / trust erosion
- **Scaling failure with size**: agent "performs reasonably well on tasks
  touching one or two files, but tasks requiring changes across 10+ files
  with architectural implications produce noticeably more mistakes than
  competing tools." Weak first PRs if instructions not configured.
- **Trust hit**: March 2026, Copilot injected promotional "tips" into 1.5M+
  PRs — widely seen as eroding developer confidence.
- **Usage-based credit billing** (model/reasoning-dependent) makes cost
  unpredictable month-to-month; multiple discussions frame this as a "trust
  problem," not just a price problem.

## Relevance to Hermes Canvas
- Validates "deliver agent work as a reviewable diff/PR" but shows the PR
  surface alone doesn't solve legibility for large multi-file changes —
  the same gap Devin Review targets.
- Trust is fragile and cross-cutting: unpredictable cost + platform putting
  ads in your PRs both damage the trust that legibility features try to build.
- Confidence: HIGH for official features; MEDIUM for the size-scaling and
  switching claims (review/COMMUNITY sources).
