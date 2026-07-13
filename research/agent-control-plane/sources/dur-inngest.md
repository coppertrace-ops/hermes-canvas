# Inngest — Durable Execution + Insights

- URL: https://www.inngest.com/ , https://www.inngest.com/pricing , https://www.inngest.com/blog/insights-query-events-and-runs
- Accessed: 2026-07-13
- Confidence: High (official pricing page)

## What it is / run dashboard
Workflow orchestration for stateful step functions / AI workflows. "Every function invocation gets a page showing the triggering event, every step in order, the timing of each step, the return value, and any errors. When a step fails and retries, each attempt is its own row with its error message and timestamp." Insights lets you "Query Your Events and Runs."

## Provenance vs agent self-report
"Inngest writes ingested events to a database for historical record and future replay." Server-side event log + per-step records; replay works from recorded runs, "bulk replay failed runs with a single action."

## Cron / schedule
Cron-triggered functions supported; tracing/metrics/alerts in dashboard.

## Pricing (verbatim, accessed 2026-07-13)
- Hobby: "$0/mo" — "50k executions," "5 concurrent executions," "Basic tracing, metrics, and alerts."
- Pro: "Starting at $99/mo" — "1M+ executions," overage "$50 per 1m," "7 day trace retention."
- Enterprise: "Contact us" — "90 day trace retention," "SAML, RBAC, audit trails."

## Deploy
Managed cloud; self-hosting available. Buyer: full-stack/product engineers (serverless-first).
