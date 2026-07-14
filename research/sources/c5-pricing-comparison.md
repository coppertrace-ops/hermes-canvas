# COST-FLOOR COMPARISON @ ~1-user scale (1 human + 1 agent)

Accessed: 2026-07-13. All figures re-verify against official pricing pages before committing.
Assumes: tiny data (<1 GB DB, <10 GB files), always-available app, live agent push, file attachments.

## Real monthly $ floor by component/stack

| Component | Option | Free-tier fit for 1 user? | Realistic $/mo floor | What triggers charges |
|---|---|---|---|---|
| Real-time + state | Cloudflare Workers + DO | Yes (SQLite only, hibernation) | $0 free / **$5** Paid min | Paid: $5 acct min; req >1M ($0.15/M); duration >400k GB-s ($12.50/M GB-s); non-hibernating always-on DO |
| Real-time + state | Convex | Yes | **$0** | Overages: func calls >1M ($2.20/M), DB >0.5GB, files >1GB — pay-as-you-go even on free |
| Real-time + DB + auth + storage | Supabase | Capacity yes, but auto-pauses | **$0** (w/ keep-alive) or **$25** Pro | Free projects pause after ~7 days idle; Pro $25/mo removes pausing |
| Collab backend | Liveblocks | Yes (500 rooms, unlimited MAU) | $0 / $25 Pro | Rooms >500, storage >256MB → Pro $25 |
| Collab backend | Y-Sweet (self-host) | n/a | ~$2 (Fly) + R2 | managed future uncertain (Jamsocket winding down) |
| Postgres sync | Electric Cloud | Yes (tiny writes) | ~$0 + Postgres host | $1/M writes + $2/M shape-log writes; still need Postgres |
| Persistent server | Fly.io shared-cpu-1x 256MB | pay-go | **~$2** always-on | per-second CPU/RAM; volumes $0.15/GB-mo even when stopped |
| Persistent server | Railway | credit-based | **$5** (Hobby, $5 credit) | compute beyond $5 credit |
| Frontend host | Vercel Hobby | Yes (non-commercial) | **$0** | 100GB BW, 100k func inv, 10s max; NO WebSockets/long jobs |
| Object storage | Cloudflare R2 | Yes (10GB, zero egress) | **$0** | storage >10GB ($0.015/GB), ops beyond free; egress always $0 |
| Auth (one owner) | Cloudflare Access Zero Trust | Yes (≤50 users) | **$0** | free up to 50 users |

## Recommended cheapest coherent stacks

1. **All-Cloudflare** (lowest cost + fewest vendors): Workers+DO (real-time/state, $0–$5) + R2 (attachments, $0) + Cloudflare Access (auth, $0) + Pages/Workers for frontend ($0). **Total floor: $0–$5/mo.** Server-authoritative via DO; hibernation controls cost; no CRDT needed.

2. **Convex + R2/Convex-files + Cloudflare Access**: Convex ($0) reactive backend removes socket/reconnect code + Access ($0) + attachments in Convex file storage (1GB free) or R2 ($0). **Total floor: $0/mo.** Most turnkey reactivity; watch overage card.

3. **Supabase all-in-one**: $0 in theory but auto-pause pushes you to **$25/mo Pro** for an always-on personal app — the most expensive floor of the three despite bundling.

## Bottom line
Cost floor for Hermes is genuinely **$0–$5/month**. Cloudflare (DO+R2+Access) or Convex+Access both land at/near $0. Supabase's realistic always-on floor is $25/mo due to free-project pausing. Vercel can't host the live channel alone; pair it with DO/Convex/Fly.

Confidence: HIGH on individual official numbers; MEDIUM on projected 1-user usage staying inside free bands.
