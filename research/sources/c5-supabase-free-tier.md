# Supabase — Free Tier Limits & Pricing (OFFICIAL + community)

Source: https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/billing-on-supabase
Type: official pricing + docs. Accessed: 2026-07-13. Re-verify.

## Free plan ($0)
- Database: 500 MB Postgres; shared CPU, 500 MB RAM
- File storage: 1 GB
- Egress bandwidth: 5 GB/month
- Edge function invocations: 500,000/month
- Realtime: 200 peak concurrent connections; 2M messages/month; 256 KB max message size
- Up to 2 active projects; 50,000 MAU (auth)
- **PROJECT PAUSING**: free projects auto-pause after ~7 days of no API requests. Data retained but app goes offline until manually resumed. This is the #1 gotcha for a low-traffic single-user app.

## Pro plan
- $25/month. No project pausing. Daily backups. 8 GB DB, 100 GB storage, 250 GB egress included.

## Realtime model
- Built on Postgres Write-Ahead Log (WAL). Subscribe to table/filtered rows; notified on insert/update/delete.
- Caveat (community/comparison): realtime data isn't delivered on the same consistent channel as queries, so weaker consistency guarantees than Convex's re-run model.

## Interpretation for Hermes
Free tier technically fits 1-user scale on capacity, BUT auto-pause makes it a poor fit for a "public-hosted, always-available" personal app unless you either (a) ping it to keep alive or (b) pay $25/mo Pro to disable pausing. So realistic cost floor for an always-on Supabase deployment = **$25/month** (Pro), OR $0 with a keep-alive cron hack (fragile). Includes auth + realtime + Postgres + storage in one product — the bundling is its main advantage.

Confidence: HIGH for numbers; pausing behavior HIGH (official + multiple community reports).
