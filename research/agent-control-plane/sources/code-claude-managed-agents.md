# Claude Managed Agents — session event stream & console observability

**Primary URLs:**
- https://platform.claude.com/docs/en/managed-agents/events-and-streaming
- https://platform.claude.com/docs/en/managed-agents/reference (event catalog)

**Accessed:** 2026-07-13

## Verbatim quotes (PRIMARY / official)

- "Communication with Claude Managed Agents is event-based. You send user events to the agent, and receive agent and session events back to track status." — Anthropic-hosted run primitive with structured events.
- "User events and system events are what you send to the agent: `user.*` events kick off a session and steer it as it progresses; `system.message` updates the agent's system prompt between turns." — steer mid-run.
- "Session events, span events, and agent events are sent to you for observability into your session state and agent progress. Stream connections that opt in also receive event deltas."
- Event naming: "Session, span, agent, user, and system event type strings follow a `{domain}.{action}` naming convention." Stream deltas: `event_start`, `event_delta`.
- "Every persisted event includes a `processed_at` timestamp indicating when the event was recorded server-side." — persisted, replayable event log.
- Requires beta header `managed-agents-2026-04-01`; endpoints e.g. `POST /v1/sessions/$SESSION_ID/events`; send `user.message` to "start or continue the agent's work." Page subtitle: "interrupt or redirect your session mid-execution."

## Confidence
- HIGH: This is a hosted, event-based agent session API with structured session/span/agent events, persisted event log with timestamps, and steer/interrupt — a real structured-events + observability layer (vs terminal scraping). Still API/BYO-UI (beta); it is the backend a mission-control UI would render, not itself a many-run dashboard.
