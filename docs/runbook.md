# Hermes Canvas — deploy & owner-auth runbook (OWNER: ATLAS, plan §6/§9)

Operational steps for a real protected public deployment. No secret values live in
this file or the repo; every value below is set in a provider dashboard or via
`npx convex env set`. Environment shapes are validated in `packages/env`.

## 0. One-time provider logins (~15 min, human-only)

- `npx convex login` — authorize the Convex CLI on this machine (already done for
  the `dev:` deployment). For prod, create/select the prod deployment.
- `vercel login` — authorize the two Vercel projects (`web`, `content`).

These are account-ownership actions and are the only unavoidable manual logins.

## 1. Provision Convex Auth signing keys (one-time per deployment)

Convex Auth signs session JWTs with an RS256 keypair. Generate and install it:

```
npx @convex-dev/auth        # writes JWT_PRIVATE_KEY + JWKS to the Convex deployment env
```

Run it once against the dev deployment and once against prod (`--prod`). It also
sets `SITE_URL`. Never copy these values into the repo or `.env.local`.

## 2. Set the closed-owner env vars (Convex deployment)

```
npx convex env set OWNER_EMAIL            you@example.com                 # allowlist-of-one
npx convex env set OWNER_BOOTSTRAP_SECRET "$(openssl rand -base64 48)"    # one-time; step 4 removes it
```

- `OWNER_EMAIL` is the ONLY account that can ever exist. Any other email is
  rejected at sign-in before credentials are checked (`convex/authPolicy.ts`).
- `OWNER_BOOTSTRAP_SECRET` authorizes exactly the first account creation. Keep the
  generated value; you paste it once in step 3, then delete it in step 4.

## 3. Bootstrap the owner account (one-time, no password in the repo)

1. Deploy functions: `npx convex deploy` (prod) — schema now includes the auth
   tables and `convex/http.ts` mounts the auth routes.
2. Deploy the `web` app (Vercel) with `NEXT_PUBLIC_CONVEX_URL` pointed at the
   deployment.
3. Visit `/signin?setup=1`, enter `OWNER_EMAIL`, choose a strong password, and
   paste the `OWNER_BOOTSTRAP_SECRET`. This is the only time sign-up is possible,
   and it requires the secret — there is no public sign-up and no race window.

## 4. Close the bootstrap (permanent)

```
npx convex env remove OWNER_BOOTSTRAP_SECRET
```

With the secret gone the sign-up flow is refused forever: the owner account cannot
be re-created or hijacked. Only `flow: "signIn"` works from now on.

## 5. Verify (Gate G0 auth acceptance)

- Signing in as `OWNER_EMAIL` reaches the workspace.
- Signing in (or attempting setup) with any other email is rejected.
- After step 4, `/signin?setup=1` with the owner email fails ("sign-up is
  disabled"). These properties are unit-proven in `convex/authPolicy.test.ts` and
  `convex/authGuard.test.ts` (`pnpm --filter @hermes/web test`).

## 6. Hermes service token (agent surface, distinct from human auth — plan §2.1)

```
TOKEN="$(openssl rand -hex 32)"
npx convex env set HERMES_SERVICE_TOKEN_SHA256 "$(printf %s "$TOKEN" | shasum -a 256 | cut -d' ' -f1)"
# then install $TOKEN in the Hermes host runtime env (never in this repo)
```

Rotation = regenerate, reset the Convex env, update the Hermes env; the old token
dies immediately. See `convex/lib/agentAuth.ts`.

## 7. Local demo mode (never production)

For a Convex-less local preview, leave `NEXT_PUBLIC_CONVEX_URL` unset — the app
renders the clearly-labeled demo seed with auth wiring inert (middleware and
providers both no-op). To exercise live Convex locally without sign-in, set
`DEMO_AUTH_BYPASS=true` in `.env.local`. This bypass is honored ONLY when
`NODE_ENV`/`VERCEL_ENV` is not `production` (`@hermes/env::isDemoBypassEnabled`);
it can never take effect on a deployed owner environment.

## 8. Deploy / rollback (plan §9)

- **Web (Vercel):** immutable deployments; rollback = re-promote the previous
  build.
- **Convex:** `npx convex deploy` from a git commit; rollback = redeploy the prior
  commit. Schema changes after G1 are additive-only (the auth tables were added
  additively).

## Owner authorization on browser-only writes (DONE — WARDEN, `wave1/authz-guards`)

The reusable owner guard is `convex/authGuard.ts::requireOwner`. It is now applied
to every browser-initiated write — each `await requireOwner(ctx)` at the top of the
handler, mirroring `files.ts::generateUploadUrl`:

- `human.sendMessage` (`convex/human.ts`)
- `canvas.restoreArtifact` (`convex/canvas.ts`)
- `lastSeen.markSeen` (`convex/lastSeen.ts`)
- `metrics.recordEvent` (`convex/metrics.ts`)

The agent surface is deliberately untouched: the `/agent/*` HTTP routes gate on the
service token (`lib/agentAuth.ts`) and delegate to the `internal.agentWrites.*`
mutations, none of which adopt `requireOwner` — no user identity exists on the
service-token path. The dual-use read queries that layer reaches via `ctx.runQuery`
(`canvas.pendingWork` / `listArtifacts` / `readArtifact`) also stay un-guarded for
the same reason; guarding them would break the agent read path.

Browser-only READ queries (`lastSeen.getLastSeen`, `lastSeen.listArtifactChanges`,
`metrics.readershipSummary`, `metrics.listEvents`) are left un-guarded within the
scope of this owner-*write* pass: they expose only the single owner's own cursor /
changed flags / readership counts, and no cross-tenant data exists in this
single-owner deployment. Extending the guard to them (least-privilege hardening of
reads) is a small, safe follow-up but out of this change's scope.

The boundary is proven in `convex/authz.test.ts` (anonymous rejects, owner
succeeds, agent internal path + dual-use reads stay open).
