# Hosting/Compute Cost Floor — Fly.io / Railway / Vercel (OFFICIAL + community)

Accessed: 2026-07-13. Re-verify (Fly & Railway changed free tiers recently).

## Fly.io — https://fly.io/docs/about/pricing/
- Billed per-second for CPU/RAM only while Machine is running. Stopped Machines: no CPU/RAM charge.
- Cheapest useful VM: shared-cpu-1x, 256 MB RAM ≈ **$1.94–$2.02/month** always-on (community calc).
- Volumes bill even when Machine stopped: $0.15/GB-month — so scale-to-zero still costs for attached storage.
- Free allowance largely removed in 2026 ("free tier died" per community). Assume pay-as-you-go from $0 usage but effectively ~$2/mo for one always-on small VM. Good fit for a persistent WebSocket server / long-running agent process.

## Railway — https://railway.com/pricing (community-sourced numbers)
- Hobby/Developer plan **$5/month**, includes $5 compute credits; small personal projects often fit within credit.
- Pro $20/month per member.
- Supports persistent processes: WebSocket servers, background workers, long-running services (unlike Vercel).

## Vercel — https://vercel.com/pricing
- Hobby (free): 100 GB bandwidth, 100k serverless function invocations/mo, function max duration 10s (Hobby) / 60s–300s (Pro). Commercial use prohibited on Hobby.
- **CANNOT run a WebSocket server, background worker, or long-running process.** Functions are ephemeral and time-limited. Real-time push on Vercel requires an external service (Convex, Liveblocks, Ably, or a Cloudflare/Fly backend).
- Pro $20/month/user.

## Interpretation for Hermes (needs live agent push + long-running work)
- Vercel alone is insufficient for server-authoritative WebSocket + streaming agent — needs a stateful backend.
- Realistic persistent-server floor: **Fly ~$2/mo** or **Railway ~$5/mo** for an always-on Node/WS server; **Cloudflare Workers+DO $5/mo** (or $0 on free w/ hibernation) is the cheapest managed real-time option.
- Vercel is fine as the static/Next.js frontend host ($0 Hobby if non-commercial) paired with one of the above.

Confidence: Fly/Vercel HIGH (official); Railway MEDIUM (community numbers).
