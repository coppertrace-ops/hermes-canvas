# Restate — Durable Execution Engine

- URL: https://www.restate.dev/ , https://www.restate.dev/blog/announcing-restate-cloud-public , https://docs.restate.dev/foundations/key-concepts
- Accessed: 2026-07-13
- Confidence: Medium-High (official site/blog; exact paid rates not published on page fetched)

## What it is / run dashboard
Rust-based durable execution engine; "records each step of a function as it runs, so when something fails, the function resumes from the last completed step." Server "sits at a similar place in your stack as a message broker," receives invocation events, persists them, pushes to services. Observability described as "Detailed timelines for ongoing and previous workflow executions."

## Provenance vs agent self-report
Journal-based: each invocation's steps are durably recorded server-side (the journal), replayed deterministically. Truth lives in the Restate journal, independent of the service/agent code.

## Cron / schedule
Supports delayed calls and scheduled invocations via the durable execution primitives (not a dedicated cron-monitoring UI).

## Agent-specific
Positioned for "Durable Workflows & Agents" in the Restate Cloud public launch.

## Pricing (verbatim)
"usage-based pricing" with a free tier of "50k actions/month" and "no credit card required." Specific paid per-action rates not shown on the announcement page.

## Deploy
Restate Cloud (managed) or self-host single Rust binary. Buyer: backend/platform engineers.
