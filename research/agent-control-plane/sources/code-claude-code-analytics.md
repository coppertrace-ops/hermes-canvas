# Claude Code — Teams/Enterprise analytics & observability

**Primary URLs:**
- https://code.claude.com/docs/en/analytics
- https://support.claude.com/en/articles/12157520-claude-code-usage-analytics
- https://platform.claude.com/docs/en/manage-claude/claude-code-analytics-api

**Accessed:** 2026-07-13

## Verbatim quotes / findings (PRIMARY / official)

- Analytics dashboard at claude.ai/analytics/claude-code, viewable by Admins and Owners (Team/Enterprise).
- Team/Enterprise dashboard metrics: "lines of code accepted, suggestion accept rate, daily active users and sessions," contribution metrics (PRs and lines shipped via GitHub integration), a leaderboard of top contributors, and data export.
- API customers get a separate Console dashboard focused on usage and spend, incl. per-user cost breakdowns (no GitHub contribution side).
- "The Claude Code Analytics Admin API provides programmatic access to daily aggregated usage metrics."
- OpenTelemetry: "you can enable the OpenTelemetry export and stream metrics and events into your own observability stack" for real-time / session-level visibility.
- Contribution metrics are public beta; only cover users within your claude.ai org; Console API / third-party usage not included.

## Confidence
- HIGH that these dashboards exist. IMPORTANT DISTINCTION: this is a USAGE/SPEND/PRODUCTIVITY analytics dashboard (aggregate metrics, leaderboards, cost), NOT a live per-run mission-control that shows in-flight run state, tool events, diffs, and controls across many concurrent runs. Live run legibility is left to OpenTelemetry export into a BYO observability stack.
