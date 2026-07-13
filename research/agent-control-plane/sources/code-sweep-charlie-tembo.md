# Sweep, Charlie Labs, Tembo — coding-agent startups

**Accessed:** 2026-07-13
**Confidence:** MED (official sites + docs; some pricing via review aggregators = labeled ANECDOTE).

## SWEEP — docs.sweep.dev
URL: https://docs.sweep.dev/pricing ; https://sweep.dev
- What: "AI junior developer" — GitHub issue / Jira ticket -> plans -> writes code -> opens a PR. Also "AI Code Review" + IDE autocomplete/inline edit (JetBrains + VS Code).
- "no new tools or terminals — just a GitHub issue that becomes a PR." (workflow-embedded, NOT a standalone run dashboard).
- Pricing: "$40 in Sweep API credits per seat, with additional pay-as-you-go usage charged to the organization." "the underlying cost of the LLM plus a 5% markup." "Unused credits roll over for 30 days." Free tier for open source; team paid plans (a "$20 pro plan" referenced). "$480/mo" starting figure for non-OSS = ANECDOTE (aiagentslist review, not confirmed on docs).
- Provenance = native GitHub PR/branch/commits. Human controls = review the PR + comment (GitHub-native), not a bespoke steer/stop console.

## CHARLIE LABS (Charlie) — charlielabs.ai
URL: https://charlielabs.ai/
- What: "Daemons are always-on AI processes that work proactively across Slack, Linear, GitHub, and more." Autonomous engineering assistant: coding tasks, PR review, bug fixes, feature implementation.
- Config: "Defined with simple .md files" (frontmatter + markdown). Triggers = event-based (PR opened, issue created), scheduled sweeps (cron e.g. "0 9 * * *"), or hybrid.
- Human controls: "deny rules" e.g. "deny: merge pull requests, push to protected branches"; policy sections cap work per activation.
- Integrations: GitHub, Slack, Linear, Sentry, Vercel. Runs "where work happens" (event-driven), NOT a multi-run mission-control dashboard (no dashboard documented on site). Hosted SaaS; pricing NOT public on site (contact/waitlist).

## TEMBO — tembo.io
URL: https://www.tembo.io/blog/top-coding-agent-tools ; tembo.io
- What: AI engineering assistant — automates routine coding tasks, "monitoring systems 24/7 to identify and fix production errors automatically," and Postgres/database performance (slow queries, missing indexes). Roots in managed Postgres.
- Pricing (Tembo pages, accessed 2026-07-13): Free $0 (10 credits/week, 1 repo, all integrations); Pro $60/mo (100 credits/mo, up to 10 users, unlimited repos); Max $200/mo (400 credits/mo, up to 10 users, priority support).
- Provenance = GitHub PRs; human control = review PR. No dedicated multi-run mission-control console documented.

## SUMMARY
All three are workflow-embedded (issue/PR/Slack/Linear) autonomous agents, NOT run-observability control planes. Provenance rides on GitHub-native PR/branch/commit. Human control = GitHub PR review + config-file deny rules (Charlie). None offers a Hermes-style legible per-run event timeline as a product surface.
