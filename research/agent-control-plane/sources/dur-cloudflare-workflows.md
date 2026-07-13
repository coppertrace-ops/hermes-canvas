# Cloudflare Workflows + Durable Objects

- URL: https://developers.cloudflare.com/workflows/ , https://developers.cloudflare.com/workflows/reference/pricing/ , https://blog.cloudflare.com/building-workflows-durable-execution-on-workers/
- Accessed: 2026-07-13
- Confidence: High (official docs pricing)

## What it is / run dashboard
Durable execution on Workers; "chain together multiple steps, automatically retry failed tasks, and persist state for minutes, hours, or even weeks." Dashboard "shows workflow instances, step progress, and error messages ... generates visual diagrams of each workflow by parsing the TypeScript source via ASTs, so a complex workflow ... renders as a flowchart." "You can get all the SQLite data for your workflow and its instances by calling the REST APIs."

## Provenance vs agent self-report
Per-instance step state persisted (SQLite, on Durable Objects storage). Instance history retained 3 days (Free) / 30 days (Paid). Truth = persisted step records.

## Cron / schedule
Workers Cron Triggers + Durable Object alarms (schedule primitives), separate from Workflows.

## Pricing (verbatim, accessed 2026-07-13)
Billed on CPU time, Requests (invocations), Storage (GB), Steps.
- Paid: "10 million/month included + $0.30 per additional million" (requests); "500,000/month included + $0.80 per additional 100,000" (steps); storage "1 GB/month included + $0.20/GB-month."
- Retention: Free "3 days," Paid "30 days." "You don't pay while your Workflow is sleeping."

## Deploy
Cloudflare platform only. Buyer: Workers/edge developers.
