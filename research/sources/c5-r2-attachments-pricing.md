# Cloudflare R2 — Object Storage Pricing & Attachment Patterns (OFFICIAL)

Source: https://developers.cloudflare.com/r2/pricing/ ; https://developers.cloudflare.com/r2/api/s3/presigned-urls/
Type: official docs. Accessed: 2026-07-13. Re-verify.

## Free tier (permanent, does not expire)
- 10 GB stored/month
- 1M Class A operations/month (writes/list)
- 10M Class B operations/month (reads)
- **Zero egress fees** — always, on free and paid, incl. via r2.dev, S3 API, Workers API

## Paid rates (beyond free tier)
- Storage: $0.015/GB-month
- Class A ops: $4.50/million; Class B ops: $0.36/million
- Egress: $0 (this is R2's core differentiator vs S3)

## Attachment serving patterns (from official docs + community)
- **Presigned URLs**: S3-concept; time-limited signed URLs for direct browser upload/download without exposing credentials. Treat as bearer tokens; use short expiry.
  - IMPORTANT limitation: presigned URLs must use R2's original endpoint domain — they do NOT work with R2 custom domains. For branded-domain serving use a Worker that checks auth then streams/redirects.
- **CORS**: browser uploads/downloads via presigned URL require a CORS policy on the bucket (AllowedOrigins/Methods/Headers) or they fail even with a valid signature.
- **Separate origin for user content**: best-practice is to serve uploads from a distinct apex domain (like GitHub's githubusercontent.com) to contain XSS/blast radius. R2 custom domains make this easy.

## Interpretation for Hermes
Attachments cost floor = **$0/month** (10 GB + generous ops free, zero egress). Pattern: Worker/DO issues short-lived presigned upload URL OR proxies uploads; serve downloads from a separate user-content subdomain via a Worker that authorizes then reads R2. Zero egress means no bandwidth surprises regardless of file serving volume.

Confidence: HIGH.
