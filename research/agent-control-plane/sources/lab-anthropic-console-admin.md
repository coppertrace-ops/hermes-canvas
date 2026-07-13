# Anthropic Console / Claude Code analytics / Enterprise admin

**Accessed:** 2026-07-13
**Confidence:** high (usage/analytics/compliance docs); med on Logs UI depth

## Sources
- Track team usage with analytics — https://code.claude.com/docs/en/analytics
- Console dashboard/logs — https://console.anthropic.com/dashboard , /logs
- Enterprise solutions — https://claude.com/solutions/enterprise
- Compliance API — https://platform.claude.com/docs/en/manage-claude/compliance-api
- Claude Code + admin controls (news) — https://www.anthropic.com/news/claude-code-on-team-and-enterprise
- Pricing — https://claude.com/pricing

## Console (developer platform)
Provides usage & cost reporting (by model, API key, date; token counts) + a Logs view of API requests. API-request-level, NOT agent-run-trace-level. For agent-run tracing, docs route back to OpenTelemetry export (self-hosted/3rd-party).

## Claude Code native dashboards = adoption analytics, NOT run traces
- "Usage metrics: lines of code accepted, suggestion accept rate, daily active users and sessions."
- "Contribution metrics: PRs and lines of code shipped with Claude Code assistance, with GitHub integration" + Leaderboard + Data export.
- Dashboards at claude.ai/analytics/claude-code (Teams/Enterprise) and platform.claude.com/claude-code (API). Plus Claude Code Analytics API + Enterprise Analytics API.
→ KEY GAP: these are productivity/spend analytics, NOT per-run agent traces / replay / mission-control.

## Enterprise admin / provenance
- Enterprise page lists: "Usage analytics and reporting", "Audit logs and OpenTelemetry monitoring", SSO/SAML, SCIM, "SOC 2, ISO 27001, GDPR, and CCPA compliance."
- Compliance API: "Programmatic access to your organization's Claude activity, chats, files, projects, and users for compliance, audit, and governance." Activity Feed (GET /v1/compliance/activities) with per-event actor, ip_address, type. (Closest thing to native provenance/audit.)

## Pricing (verbatim)
- Team: "$20 Per seat / month if billed annually. $25 if billed monthly." Premium: "$100... $125 if billed monthly." Enterprise: "Seat price + usage at API rates" / "$20/seat."

## Assessment
Native admin/audit/analytics dashboards exist, but there is NO first-party hosted cross-run "agent observability / mission-control" console for SDK-built agents. Pattern = export-to-your-own-backend (OTel) + build-your-own review UI. (High-confidence inference, not a quoted denial.)
