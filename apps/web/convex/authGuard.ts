/**
 * Owner authorization guard for the human surface (OWNER: ATLAS, plan §6).
 *
 * The canonical "is this the signed-in owner?" check for any non-`/agent/*` query
 * or mutation the browser can call. Convex Auth has already enforced the
 * allowlist-of-one at sign-in (`authPolicy`), so a present identity IS the owner;
 * this guard's job is to require that an identity exists at all.
 *
 * The demo/local bypass is honored ONLY in non-production and only with explicit
 * opt-in — the single decision point is `@hermes/env::isDemoBypassEnabled`, which
 * returns false whenever NODE_ENV or VERCEL_ENV is "production". A deployed owner
 * environment can therefore never run un-authenticated, regardless of any flag.
 * (`files.ts` already applies this same pattern to uploads.)
 *
 * ADOPTION NOTE: the browser-callable writes on the LEDGER/CHRONICLE surface
 * (`canvas.restoreArtifact`, `human.sendMessage`, `lastSeen.markSeen`,
 * `metrics.recordEvent`) should each `await requireOwner(ctx)` at their top. They
 * are owned by other agents and left untouched here per the Wave 1 path-ownership
 * split; this module is the shared seam they import. The dual-use read queries
 * that the `/agent/*` HTTP layer reaches via `ctx.runQuery` must NOT adopt this
 * guard (no user identity exists on the service-token path) — that mixed
 * authorization is LEDGER's to design.
 */

import { isDemoBypassEnabled } from "@hermes/env";

/** The minimal slice of a Convex ctx this guard needs (works for query + mutation). */
export interface AuthCtx {
  auth: { getUserIdentity(): Promise<{ subject: string } | null> };
}

/**
 * Require the authenticated owner. Resolves if an identity is present; in
 * non-production with the demo bypass explicitly enabled it also resolves;
 * otherwise it throws. Never resolves un-authenticated in production.
 */
export async function requireOwner(
  ctx: AuthCtx,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return;
  if (isDemoBypassEnabled(env)) return;
  throw new Error("unauthorized: owner sign-in required");
}
