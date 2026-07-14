# Auth-for-One — Cloudflare Access vs OAuth allowlist vs Passkeys (OFFICIAL + community)

Type: official docs + community tutorials. Accessed: 2026-07-13.
Sources: developers.cloudflare.com/cloudflare-one/... ; cloudflare.com/plans/zero-trust-services/

## Cloudflare Access (Zero Trust) — allowlist of one email
- Free plan is PERMANENT (not a trial): up to 50 users at $0, full ZTNA.
- Setup for single owner:
  1. Zero Trust dashboard → Settings → Authentication → enable "One-time PIN" login method (commonly missed; without it no OTP emails send).
  2. Access → Applications → Add application → Self-hosted → point at your app hostname (must be on Cloudflare / behind a Tunnel).
  3. Add policy, action Allow, Include → Emails → your single email. "A single email is a valid allowlist of one."
- Login = email OTP (10-min PIN) with no IdP to run; or wire Google/GitHub OIDC if preferred. Cloudflare enforces auth at the edge BEFORE traffic reaches your app — your app can trust the `Cf-Access-Jwt-Assertion` header.
- Gotcha: OTP as Include without email restriction lets ANYONE request a code — always scope to the specific email.
- Cost: **$0/month**. Effort: ~15 min, no code.

## OAuth allowlist (roll-your-own)
- Add "Sign in with Google/GitHub", then check `email === OWNER_EMAIL`. Cheap ($0) but you build session handling, callback, cookie security yourself. More code, more attack surface.

## Passkeys
- Strongest UX/security for a single owner (no shared secret, phishing-resistant) but you implement WebAuthn registration/verification or add a library. More effort than Access for one user.

## Verdict for Hermes
Cheapest + simplest for a single owner = **Cloudflare Access free tier email-allowlist** (edge-enforced, no auth code, $0), especially if hosting on Cloudflare anyway. Fallback: OAuth-allowlist-of-one if not on Cloudflare. Passkeys are nicer UX but more build effort than justified for one user.

Confidence: HIGH (official free-tier + documented setup steps).
