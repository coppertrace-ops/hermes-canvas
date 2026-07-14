# Live-Update Channel — Convex reactivity vs Supabase Realtime vs Durable Objects+WS

Type: comparison articles (community) + official docs. Accessed: 2026-07-13.
Sources: convex.dev/compare/supabase; devtoolsacademy.com/blog/supabase-vs-convex;
developers.cloudflare.com/durable-objects/best-practices/websockets/

## Convex reactivity
- Every query function is automatically a live subscription. When any data the query reads changes, Convex re-runs it server-side and pushes the new result to the client. Strict serializable transactions; optimistic concurrency retries conflicting writes.
- Server IS the source of truth by design; you don't manage sockets/reconnection — the client SDK handles it. Least infra work for server-authoritative push.
- Cost model = function calls (each re-run counts).

## Supabase Realtime
- Postgres WAL-based. Subscribe to table or filtered rows; get insert/update/delete events. Also has "broadcast" and "presence" channels.
- Weaker consistency: realtime events aren't delivered on the same consistent channel as your queries (you may need to refetch to reconcile). You manage more of the state-sync logic yourself.
- Free tier: 200 concurrent connections, 2M msgs/mo.

## Durable Objects + WebSocket
- A single DO instance = single source of truth for one conversation/workspace; holds state, coordinates concurrent access, broadcasts changes to connected clients.
- Most control, lowest-level. You implement the protocol, broadcast fan-out, and reconnection. Hibernation API keeps sockets open while evicting from memory (cost savings). Reconnect handled client-side with exponential backoff; on deploy/eviction clients see a brief reconnect.

## Tradeoff summary for Hermes (1 human + 1 agent, server-authoritative)
- Convex = least code, built-in reactivity + consistency, $0 at this scale — strong default.
- Supabase = you also get SQL + auth + storage bundled, but realtime consistency is weaker and free projects auto-pause.
- DO+WS = cheapest/most control and a natural "one object per conversation" model that fits an agent streaming tokens into a live doc; more implementation effort.

Confidence: MEDIUM-HIGH (mix of official docs and vendor/community comparisons — vendor comparisons are biased, cross-checked).
