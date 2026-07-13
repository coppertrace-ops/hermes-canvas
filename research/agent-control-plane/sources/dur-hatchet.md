# Hatchet — Orchestration engine (durable tasks)

- URL: https://hatchet.run/ , https://docs.hatchet.run/home/durable-execution , https://hatchet.run/use-cases/ai-agents
- Accessed: 2026-07-13
- Confidence: Medium-High (official site/docs; pricing not published on pages fetched)

## What it is / run dashboard
Postgres-backed orchestration engine for background tasks, AI agents, durable workflows. Dashboard: "see all your workflows, get alerts when tasks fail, and export metrics ... Status updates and metrics are real-time and searchable for easy debugging."

## Provenance vs agent self-report
"Every task and agent invocation is durably persisted in Hatchet, allowing for debugging, retries and replays." Durable tasks "checkpoint progress so it can recover from crashes ... resume on any worker without re-executing completed work." Positioned as "a drop-in replacement for Temporal or DBOS workflows."

## Cron / schedule
Supports cron + scheduled runs; OpenTelemetry traces forwarded to your stack.

## Pricing
Not published on pages fetched (Hatchet Cloud managed + self-host OSS). No fabricated numbers.

## Deploy
Hatchet Cloud (managed) or self-host. Buyer: backend/platform engineers.
