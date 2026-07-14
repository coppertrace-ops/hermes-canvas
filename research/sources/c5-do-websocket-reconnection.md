# DO WebSocket — Hibernation, Reconnection & Source-of-Truth (OFFICIAL + community)

Type: official docs + engineering blogs. Accessed: 2026-07-13.
Sources: developers.cloudflare.com/durable-objects/best-practices/websockets/ ;
thomasgauvin.com (hibernation debugging); sunilpai.dev "Reliable UX for AI chat with Durable Objects".

## Hibernation API mechanics
- Use `webSocketMessage`, `webSocketClose`, `webSocketError` handlers (not addEventListener) + `serializeAttachment()/deserializeAttachment()` to persist per-connection state across hibernation.
- During inactivity the DO is evicted from memory but the socket stays open; on next message the runtime recreates the DO (runs constructor) and delivers the message. Duration billing pauses while hibernating — the key cost lever.
- `ctx.getWebSockets()` returns all sockets connected to the DO (for broadcast/fan-out).

## Reconnection handling
- On deploys or eviction, clients see a brief reconnect. Implement client-side reconnect with exponential backoff and it's largely invisible.
- Because the DO holds authoritative state (and can persist to its SQLite storage), a reconnecting client re-syncs from the DO — no lost source of truth.

## Server-as-source-of-truth pattern (relevant to agent chat)
- One DO instance per conversation/workspace: maintains sockets, serializes concurrent access (single-threaded), and broadcasts state changes to all connected clients.
- Sunil Pai's "Reliable UX for AI chat with DOs": DO owns the message log; agent tokens stream through the DO which persists + fans out, so a refresh/reconnect mid-stream resumes cleanly. This maps directly to Hermes' "live agent updates + versioned artifacts."

## Interpretation for Hermes
DO+WS gives a clean single-source-of-truth per conversation, resilient reconnection, and cost control via hibernation — well-suited to an agent streaming into a canvas. Cost stays at the $5/mo Workers Paid floor (or $0 on free w/ hibernation) because idle sockets don't burn duration.

Confidence: HIGH (official + credible practitioner blogs, incl. Cloudflare-adjacent authors).
