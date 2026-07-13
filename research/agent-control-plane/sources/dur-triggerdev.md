# Trigger.dev — Durable tasks, Realtime, Scheduled tasks

- URL: https://trigger.dev/ , https://trigger.dev/pricing , https://trigger.dev/product/scheduled-tasks
- Accessed: 2026-07-13
- Confidence: High (official pricing page)

## What it is / run dashboard
Managed background jobs / AI agents for TS. Dashboard: "You can perform actions like replaying, cancelling, or managing multiple runs simultaneously from the dashboard ... useful for replaying failed runs." OpenTelemetry tracing built in. Realtime API "stream responses and tool calls to your frontend" with React hooks.

## Provenance vs agent self-report
Run/step records persisted server-side; runs survive deploys and crashes. Replay from stored runs. Log retention is the audit window (see pricing).

## Cron / schedule
Dedicated scheduled tasks: "recurring schedules of up to a year, which never hit a function timeout ... created in your task code, or added in the dashboard." Schedules are a billed line item.

## Pricing (verbatim, accessed 2026-07-13)
- Free: "$0/month," "$5/month free credits," "20 concurrent runs," "10 schedules," "1 day log retention."
- Hobby: "$10/month," "50 concurrent runs," "100 schedules," "7 day log retention."
- Pro: "$50/month," "200+ concurrent runs," "1000+ schedules" then "$10/month per 1,000," "30 day log retention," "5+ custom dashboards."
- Compute: "$0.000025" per run ("$0.25 per 10,000 runs").

## Deploy
Managed cloud; open-source, self-hostable. Buyer: TS/JS product teams.
