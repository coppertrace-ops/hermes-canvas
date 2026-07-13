# Vercel Workflow Development Kit (WDK)

- URL: https://vercel.com/docs/workflows , https://vercel.com/blog/introducing-workflow , https://github.com/vercel/workflow
- Accessed: 2026-07-13
- Confidence: High (official docs/blog)

## What it is / run dashboard
Open-source TS framework making "durability a language-level concept" that "runs on any framework, platform, and runtime." "Every step, input, output, sleep, and error inside a workflow is recorded automatically, and you can track runs in real time, trace failures, and analyze performance without writing extra code." "Workflows survive deployments and crashes with deterministic replays."

## Provenance vs agent self-report
All steps/inputs/outputs/errors auto-recorded server-side; deterministic replay from recorded journal. Truth = recorded run, not agent narration.

## Scale signal
"Since launching in beta in October 2025, Workflows has processed over 100 million runs and over 500 million steps across more than 1,500 customers."

## Cron / schedule
Vercel Cron Jobs are a separate platform feature; WDK covers durable step execution.

## Pricing (verbatim)
"Pay only for Events, Data Written, and Data Retained." "During the Beta period, Workflow Observability is free for all plans, while Workflow Steps and Storage are billed at specified rates."

## Deploy
Vercel-managed (WDK OSS, runtime-portable). Buyer: TS/Next.js product teams, AI agent builders.
