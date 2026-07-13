# Google Jules — async coding agent

**Primary URLs:**
- https://jules.google/ (landing)
- https://jules.google/docs/usage-limits/ (limits/plans)
- https://developers.google.com/jules/api (REST API)
- https://blog.google/.../google-labs/jules/ (announcement)

**Accessed:** 2026-07-13

## Verbatim quotes (PRIMARY / official)

- Hosted VM: "Jules fetches your repository, clones it to a Cloud VM, and develops a plan." (jules.google) — fully hosted-managed.
- Parallel: "15 concurrent tasks, so you can run multiple threads in parallel" (Pro); "60 concurrent tasks, built for massively parallel workflows" (Ultra).
- Provenance / controls: "Select your GitHub repository and branch"; "Jules provides a diff of the changes. Quickly browse and approve code edits"; "Jules creates a PR of the changes"; plan approval ("That looks good. Continue!").
- REST API (v1alpha, `jules.googleapis.com`, auth `X-Goog-Api-Key`): resources are **Sources** ("input source... a GitHub repository"), **Sessions** ("a continuous unit of work... similar to a chat session"), **Activities** ("a single unit of work within a Session... from both the user and the agent"). List activities via GET; `sessions/SESSION_ID:sendMessage` to steer. "sessions created through the API will have their plans automatically approved" unless `requirePlanApproval: true`.
- Also: Jules Tools CLI (npm) and Gemini CLI `/jules` extension.

## Pricing (official, jules.google/docs/usage-limits, accessed 2026-07-13)
- Free (Jules): 15 tasks/day, 3 concurrent, Gemini 2.5 Pro.
- Pro (in Google AI Pro ~$19.99/mo): 100 tasks/day, 15 concurrent, "starting with Gemini 3 Pro."
- Ultra (in Google AI Ultra, $124.99–$200/mo tier): 300 tasks/day, 60 concurrent, priority latest model.
- Sold inside Google AI subscription bundles (not standalone metered).

## Confidence
- HIGH: hosted VM, task-list dashboard, parallel tasks, plan-approval + diff + PR provenance, structured Activities event model via API, CLI. Web dashboard = per-task list, not a deep fleet mission-control.
