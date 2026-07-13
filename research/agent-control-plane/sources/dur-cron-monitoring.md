# Cron / scheduled-job monitoring — Healthchecks.io, Cronitor, Dead Man's Snitch

- URLs: https://healthchecks.io/pricing/ , https://cronitor.io/pricing , https://deadmanssnitch.com/
- Accessed: 2026-07-13
- Confidence: High (official pricing pages)

## Model (dead man's switch / heartbeat)
Jobs send pings on start/success; monitor alerts when an expected ping is missed. Healthchecks: "keeps a historical log of the received pings for each monitored job ... helpful for auditing past activity of your cron jobs." This is an *external, independent* confirmation of execution (not the job self-reporting success only).

## Provenance angle
The ping log is an append-only, server-side record of whether the scheduled run actually fired and completed — independent of the job's own logs. Delivery-receipt-like semantics for scheduled work.

## Pricing (verbatim, accessed 2026-07-13)
Healthchecks.io:
- Hobbyist "$0/month" — "Monitor 20 jobs," "100 log entries per job."
- Business "$20/month" — "Monitor 100 jobs," "1,000 log entries per job."
- Business Plus "$80/month" — "Monitor 1,000 jobs."
Cronitor:
- Free (Hacker): "5 monitors included," "5-minute minimum."
- Business: "Monitors: $2/month each," "Additional Users: $5/month per user," "12 Month data retention," "30-second minimum."
- Enterprise: "Starting at $6000/year."
Dead Man's Snitch: free tier one monitor; premium from "$5 with 3 monitors" (per search).

## Deploy
Managed SaaS (Healthchecks also self-hostable OSS). Buyer: SRE/ops, small teams. Legibility: simple human-facing status pages + alerts.
