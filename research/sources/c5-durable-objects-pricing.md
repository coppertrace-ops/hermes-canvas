# Cloudflare Durable Objects — Pricing (OFFICIAL)

Source: https://developers.cloudflare.com/durable-objects/platform/pricing/
Type: official docs. Accessed: 2026-07-13. Re-verify (prices change).

## Free plan (DO included, SQLite backend ONLY)
- Requests: 100,000 / day
- Duration: 13,000 GB-s / day
- SQLite rows read: 5 million / day; rows written: 100,000 / day
- Stored data: 5 GB total cap

## Paid plan (Workers Paid, $5/mo minimum for the account)
- Requests: 1M/month included, then $0.15/million
- Duration: 400,000 GB-s/month included, then $12.50/million GB-s
  - Duration billed on 128 MB allocation at wall-clock time while DO is running or idle-in-memory (not hibernating)
- SQLite rows read: first 25B/mo incl, then $0.001/M; rows written: first 50M/mo incl, then $1.00/M
- SQLite stored data: $0.20/GB-month (storage billing started Jan 2026)
- KV backend (paid only): reads $0.20/M, writes $1.00/M, storage $0.20/GB-mo

## WebSocket billing specifics
- Incoming WS messages billed at 20:1 ratio (20 incoming msgs = 1 request)
- Outgoing messages and protocol pings are FREE
- Each new WS connection counts as 1 request
- Duration accrues while DO is in memory; **WebSocket Hibernation API** lets the DO evict from memory while keeping the socket open, so duration charges stop during idle. Critical for cost at 1-user scale.

## Interpretation for Hermes (1 human + 1 agent)
A single always-connected DO WITHOUT hibernation would accrue duration ~24/7: 128MB = 0.125 GB * 86400 s/day * 30 = ~324,000 GB-s/mo — right at the 400k free-included band but only on the $5/mo Paid plan. WITH hibernation, idle time is not billed, so realistic cost floor = the $5/mo Workers Paid minimum, essentially $5/mo covers this workload. Free plan (100k req/day, 13k GB-s/day) can host it at $0 if you tolerate SQLite-only and daily caps, but 13k GB-s/day = only ~1.2 always-on DO-days of non-hibernating compute, so hibernation is mandatory on free.

Confidence: HIGH (official pricing page).
