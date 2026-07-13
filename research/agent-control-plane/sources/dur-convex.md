# Convex — Workflow component + Crons

- URL: https://www.convex.dev/components/workflow , https://stack.convex.dev/durable-workflows-and-strong-guarantees , https://docs.convex.dev/scheduling/cron-jobs
- Accessed: 2026-07-13
- Confidence: High (official docs/components)

## What it is / run dashboard
Reactive backend platform; @convex-dev/workflow component enables "durable, resumable workflow execution ... run for extended periods (days to months), survive server restarts, and be canceled or monitored reactively." Status "can be observed by many users simultaneously via regular reactive-by-default Convex queries, and the history of each step's execution is likewise live-updating."

## Provenance vs agent self-report
Each step's execution history persisted in Convex tables; observed live via subscriptions. Truth = the durable step records, reactively queryable (notably human-legible via live UI).

## Cron / schedule
Native cron jobs: "view all your cron jobs in the Convex dashboard cron jobs view ... added, updated, and deleted cron jobs in the logs and history view. Results of previously executed runs ... available in the logs view." Also runtime-registered crons via component.

## Agent-specific
Blog "Agents Need Durable Workflows and Strong Guarantees" explicitly frames agents on the workflow component.

## Pricing
Convex platform pricing (free tier + Pro ~$25/seat historically); workflow/cron are components of the platform, not separately metered. (No standalone price to fabricate.)

## Deploy
Managed Convex cloud (or self-host OSS backend). Buyer: full-stack TS product teams.
