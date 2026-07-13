# Windmill — Open-source workflow engine

- URL: https://www.windmill.dev/ , https://www.windmill.dev/pricing , https://github.com/windmill-labs/windmill
- Accessed: 2026-07-13
- Confidence: Medium-High (official pricing page via search summary)

## What it is / run dashboard
Open-source dev platform / workflow engine; "turn scripts into webhooks, workflows and UIs." Self-describes as "Open-source alternative to Retool and Temporal." Real-time logs, audit trails, Prometheus metrics, HTTP tracing, queue metrics, critical alerts. Each script or flow run counts as one execution regardless of steps.

## Provenance vs agent self-report
Run history + audit trails persisted; observability over runs and queues. Focus is workflow ops legibility, not cryptographic provenance.

## Cron / schedule
Cron-style schedules, HTTP triggers, webhooks, manual triggers.

## Pricing (verbatim, accessed 2026-07-13)
- Self-hosted OSS: free.
- Cloud free tier: "1,000 executions per day" (~30k/mo), single user.
- Team: "$10 per user per month" removes execution limits, adds Git version control.
- EE self-hosted available (AWS Marketplace / Helm).

## Deploy
Self-host (Docker/K8s) or Windmill Cloud. Buyer: internal-tools / platform engineers.
