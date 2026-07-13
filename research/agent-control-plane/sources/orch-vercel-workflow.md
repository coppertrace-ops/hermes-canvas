# Vercel — AI SDK + Workflow (WDK) + AI Cloud

- **Accessed:** 2026-07-13
- **Type:** Primary (vercel.com/docs, vercel.com/blog, github.com/vercel/workflow)
- **Confidence:** high

## What it is
- **Vercel AI SDK** — OSS TS toolkit for LLM apps/agents (generate/stream/tools/agents).
- **Vercel Workflow / Workflow Development Kit (WDK)** — OSS TS framework making durability a language-level concept (`'use workflow'`, `'use step'`). GA April 2026 ("over 100 million runs ... 1,500 customers").
- **Vercel Workflows (managed)** — "a fully managed platform for building durable applications and AI agents." Part of Vercel AI Cloud (zero-config backends).

## Hosted run control plane: YES (managed, on Vercel)
- "Observable: Use built-in logs, metrics, and tracing and view them in your Vercel dashboard." "track runs in real time, trace failures, and analyze performance." Observability → Workflows in dashboard, "no configuration or storage."

## HITL / approval gates: YES (pause/resume + hooks)
- "Sleep and hooks: Pause for minutes to months, or wait for external events." Functions "pause for minutes or months, survive deployments and crashes, and resume exactly where they stopped." (Human approval = wait-for-event hook.)

## Durable state & provenance: YES
- Deterministic replay: "inputs and outputs are recorded ... for deterministic replay if a deploy or crash occurs." Managed persistence stores state + event logs.

## Multi-agent: supported via workflow composition (AI SDK agents + durable steps); not an opinionated multi-agent framework.

## Buyer / deploy
- Buyer: TS/JS web developers (Vercel's base), extending to AI backends.
- Deploy: OSS WDK (any platform) + managed on Vercel AI Cloud (SaaS).

## PRICING
- WDK: OSS/free. Managed Workflows: "Usage-based pricing: Pay only for Events, Data Written, and Data Retained" (docs/workflows/pricing) — "only actual execution time charged, not idle resources." Runs on Vercel plans (Hobby free / Pro $20/user/mo / Enterprise custom); exact per-Event $ on the workflows pricing subpage.

## Sources
- https://vercel.com/docs/workflows (high)
- https://vercel.com/blog/introducing-workflow (high)
- https://github.com/vercel/workflow (high)
- https://vercel.com/docs/workflows/pricing (high, model; exact per-unit $ to re-verify)

## Relevance to Hermes
NEAR-DIRECT-to-adjacent. Real managed durable-run plane with dashboard observability + pause/resume, but developer/devops-first (code directives, TS), legibility = traces/logs, no human-first narrative/approval workspace. Strong distribution (Vercel base) = bundling risk.
