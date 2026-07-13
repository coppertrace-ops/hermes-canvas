# DBOS — Postgres-backed Durable Execution

- URL: https://www.dbos.dev/ , https://www.dbos.dev/dbos-pricing , https://www.dbos.dev/blog/postgres-is-all-you-need-for-durable-execution
- Accessed: 2026-07-13
- Confidence: High (official pricing page)

## What it is / run dashboard
Open-source library (Python/TS/Go/Java) that runs inside your app and stores workflow state + execution history in your existing Postgres. "workflows and their steps are checkpointed to Postgres tables, which means observability is built-in." Conductor console: "Monitor, version, fork, replay, and observe durable workflows." Features listed: "Real-time workflow management console," "Workflow monitoring and tracing," "Workflow distributed recovery," "Workflow versioning, forking."

## Provenance vs agent self-report
Checkpoints in Postgres tables you own ("Full data ownership (bring your own database)"). The checkpoint rows are the durable truth; replay uses recorded step outputs.

## Cron / schedule
Scheduled workflows supported in library; OpenMetrics endpoint for Datadog/Grafana.

## Pricing (verbatim, accessed 2026-07-13)
- Library is "100% open-source" / free.
- DBOS Pro: "$99/month" — "2 user seats," "up to 3 DBOS apps," "1 million checkpoints ... per month," extra "$50 per million."
- DBOS Teams: "$499/month" — "10 user seats," "10 DBOS apps," "10M free checkpoints," extra "$40 per million."
- Enterprise: custom / self-hosted Conductor.
- Billing basis: checkpoints ("workflows, steps, transactions").

## Deploy
Self-host library + optional DBOS Cloud/Conductor. Buyer: backend engineers.
