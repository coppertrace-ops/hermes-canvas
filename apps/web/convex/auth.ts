/**
 * Convex Auth — closed-owner Password provider (OWNER: ATLAS, plan §6).
 *
 * `@convex-dev/auth` with the Password provider, an allowlist of exactly one
 * (`OWNER_EMAIL`), and no public sign-up. The behavioral rules live in the pure,
 * unit-tested `authPolicy` module; this file only binds them to the provider and
 * exports the generated auth surface.
 *
 * Sessions are Convex Auth JWTs. Every human-facing query/mutation authorizes off
 * `ctx.auth.getUserIdentity()` (see `authGuard.requireOwner`); the Next middleware
 * only redirects — the trust boundary is here and in the Convex functions, never
 * the frontend (plan §6).
 *
 * No credentials are hardcoded: the owner email and the one-time bootstrap secret
 * come from Convex deployment env; the JWT signing keys are provisioned once by
 * `npx @convex-dev/auth` (see docs/runbook.md).
 */

import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { ownerProfile } from "./authPolicy";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Runs for every flow before credential logic: rejects non-owner emails
      // (allowlist-of-one) and refuses sign-up without the one-time bootstrap
      // secret. See authPolicy.ts for the rules and tests.
      profile: (params) => ownerProfile(params),
    }),
  ],
});
