# Real-time/Collab Backends — Liveblocks / PartyKit / Y-Sweet (OFFICIAL + community)

Accessed: 2026-07-13. Re-verify.

## Liveblocks — https://liveblocks.io/pricing
- Free plan: up to 500 monthly active "rooms", 256 MB realtime storage, unlimited MAU (billing counts a user only if they return on a different calendar day), 50 MB max file upload, 10 projects, 24h event-log retention.
- Pro: **$25/month**; Team $500/month.
- Built on Yjs for collaborative data; gives presence, comments, storage, notifications out of the box.

## PartyKit — https://www.partykit.io/
- **Acquired by Cloudflare.** Built on Cloudflare Workers + Durable Objects; global edge, low latency. "Bring your own CRDT" (works with Yjs but not required).
- Historically usage-based with generous free tier; pricing now effectively flows through Cloudflare Workers/DO economics (see DO pricing capture). Good for custom server-authoritative logic per "room".

## Y-Sweet (Jamsocket) — https://jamsocket.com/y-sweet
- Open-source Yjs server; persists docs to S3-compatible storage (incl. R2) rather than a DB — cheap for many accumulating docs, writes scale horizontally.
- Managed free tier: 10 GB storage. NOTE: y-sweet.cloud shows "Jamsocket is shutting down" — managed hosting future uncertain; self-host remains viable (it's OSS, runs anywhere).

## Interpretation for Hermes (1 human + 1 agent)
- Liveblocks/Y-Sweet are CRDT-collaboration-oriented — likely overkill for single-writer + agent (see CRDT capture). Their value is multi-cursor human collaboration Hermes doesn't need.
- PartyKit = essentially a nicer DX layer over DO; reasonable if you want per-conversation "party" rooms with server-authoritative state.
- Cost floor: Liveblocks $0 (free plan easily fits 1 user) but adds a dependency; PartyKit → Cloudflare $0–$5/mo; self-hosted Y-Sweet → Fly ~$2/mo + R2.

Confidence: Liveblocks numbers HIGH; PartyKit/Y-Sweet MEDIUM (in flux post-acquisition/shutdown).
