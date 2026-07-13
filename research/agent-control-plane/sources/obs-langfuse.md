# Langfuse (open source + cloud)

- URL (pricing): https://langfuse.com/pricing
- URL (self-host): https://langfuse.com/pricing-self-host
- URL (annotation): https://langfuse.com/docs/scores/annotation
- Accessed: 2026-07-13
- Confidence: high (cloud pricing/quotes); med (self-host enterprise price unpublished)

## What it is
Open-source (MIT core) LLM engineering platform: tracing, prompt management, evals, datasets, playground, annotation. Managed cloud or fully self-hosted.

## Agent-focused?
Partial. Supports agent-graph views but identity is broader LLM-app observability.
> "Traces and graphs (agents)" (pricing feature table, all tiers)
> "Session tracking (chats/threads)"

## Human-in-the-loop?
Offline labeling only, not live review of running agents.
> "Adding scores via the UI is a manual evaluation method. It is used to collaboratively annotate traces, sessions and observations with evaluation scores."
> "You can also use Annotation Queues to streamline working through reviewing larger batches of traces, sessions and observations."
Queues tier-gated: Hobby 1, Core 3, Pro/Enterprise unlimited.

## Durable run state / provenance?
Read-only trace/observation store (Postgres + ClickHouse). Persists traces/scores/datasets, not authoritative resumable run state. No live-run control plane.

## Buyer / deploy
Buyer: AI/ML + platform eng wanting OSS/self-host. Deploy: hybrid — OSS self-host (MIT core) + managed cloud + self-hosted Enterprise Edition (license key).

## Pricing (accessed 2026-07-13)
- Hobby: Free, 50k units/mo, 30-day retention, 2 users.
- Core: $29/mo, 100k units/mo, 90-day, unlimited users.
- Pro: $199/mo, 100k units, 3-year retention.
- Enterprise (cloud): $2,499/mo. Self-host core free (MIT); enterprise self-host license = contact-sales.

## Anecdote (unverified)
Self-host operational burden repeatedly cited: Postgres + ClickHouse + Redis + S3 + K8s.
