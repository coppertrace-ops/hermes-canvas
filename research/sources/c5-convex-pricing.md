# Convex — Pricing (OFFICIAL)

Source: https://www.convex.dev/pricing (+ docs.convex.dev/production/state/limits)
Type: official pricing page. Accessed: 2026-07-13. Re-verify.

## Free / Starter plan ($0 base, pay-as-you-go overages)
- Function calls: 1M/month included, then $2.20 per additional 1M
- Action compute: 20 GB-hours included, then $0.33/GB-hour
- Database storage: 0.5 GB incl, then $0.22/GB
- File storage: 1 GB incl, then $0.033/GB
- Vector/search storage: 0.5 GB incl, then $0.55/GB
- Database bandwidth (I/O): 1 GB incl, then $0.22/GB
- Data egress: 1 GB incl, then $0.132/GB
- Up to 6 developers, 20 projects

## Professional plan
- $25 per developer/month
- 25M function calls incl ($2/additional 1M)
- 250 GB-hours action compute; 50 GB DB; 100 GB file; 50 GB egress

## What triggers charges / notes
- Overages are pay-as-you-go even on the free plan (card on file). Every reactive query re-run counts as a function call — a live subscription that re-fires on each state change consumes function-call budget.
- Real-time reactivity is built in: each query function is automatically a live subscription; when underlying data changes Convex re-runs the query server-side and pushes results. No separate WS infra to manage.

## Interpretation for Hermes
For 1 human + 1 agent, 1M function calls/month is generous but agent-driven rapid state updates could re-trigger many subscription re-runs. Still, realistic floor for this scale = **$0/month** on the free plan (well under 1M calls, 0.5GB DB, 1GB files). No project-pausing penalty like Supabase. Main risk = overage surprises if the agent writes very frequently.

Confidence: HIGH (official page); usage-projection MEDIUM.
