# Electric SQL — Postgres Sync Engine (OFFICIAL + community)

Type: official docs/blog + HN. Accessed: 2026-07-13.
Sources: electric-sql.com/product/electric ; electric-sql.com/blog/2026/04/02/electric-cloud-pricing ; github.com/electric-sql/electric

## What it is
- A read-path sync engine for Postgres. Handles partial replication, fan-out, and delivery of "shapes" (filtered subsets of Postgres rows) to clients over HTTP. Now positions as "the agent platform built on sync."
- Self-host: an Elixir service packaged as Docker; runs anywhere with a filesystem + HTTP port. You bring your own Postgres.

## Electric Cloud pricing (managed, self-serve, live 2026)
- Usage-based: **$1 per million writes** to any stream, plus Postgres Sync adds **$2 per million writes** emitted to the shape log from the replication stream. You pay for writes + retention.
- Self-host cost = your own infra (a container + a Postgres) — no Electric license fee.

## Fit for Hermes
- Electric is a READ-path (server→client) sync layer; it does not by itself give you server-authoritative write coordination or an agent execution runtime — you still need Postgres as source of truth and your own write path.
- Compelling if you already commit to Postgres and want reactive queries to the client with local-first caching. For a from-scratch 1-user app it's more moving parts than Convex (all-in-one) or DO (self-contained). At 1-user scale write volume is tiny, so managed cost ≈ negligible, but you still pay/run Postgres somewhere (Supabase/Neon/Fly).

Confidence: MEDIUM-HIGH (official pricing blog explicit; fit assessment is reasoned).
