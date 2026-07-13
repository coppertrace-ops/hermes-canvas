/**
 * Closed-owner auth policy — the pure decision logic (OWNER: ATLAS, plan §6).
 *
 * These functions carry the two load-bearing rules of the closed-owner design and
 * nothing else, so they can be unit-tested directly without booting the full
 * Convex Auth action stack:
 *
 *   1. Allowlist-of-one — the only account that may ever exist is `OWNER_EMAIL`.
 *      Every auth flow (signIn, signUp, reset, …) is rejected before credentials
 *      are touched unless the submitted email is the owner's.
 *   2. No public sign-up — account creation (`flow === "signUp"`) is refused unless
 *      the caller presents the one-time `OWNER_BOOTSTRAP_SECRET`. Once Frank unsets
 *      that env var after the first bootstrap, sign-up is permanently closed, so
 *      the owner account can neither be re-created nor hijacked by a signup race.
 *
 * There is NO production bypass here: the demo/local bypass (`@hermes/env`) only
 * relaxes the per-request owner *guard* on queries in non-production; it never
 * relaxes the identity allowlist. A wrong email is rejected in every environment.
 */

import { ConvexError } from "convex/values";

/** Normalize an email for allowlist comparison: trimmed, lowercased. */
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Constant-time string comparison (avoids leaking length-independent timing). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The owner email from deployment env, normalized. Throws (config error) if unset
 * — a closed-owner deployment with no configured owner must fail closed, never
 * default to open.
 */
export function ownerEmail(env: Record<string, string | undefined> = process.env): string {
  const configured = normalizeEmail(env.OWNER_EMAIL);
  if (!configured) {
    throw new ConvexError("auth misconfigured: OWNER_EMAIL is not set");
  }
  return configured;
}

/** Reject any email that is not the configured owner (allowlist-of-one). */
export function assertOwnerAllowed(
  email: string,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!constantTimeEqual(email, ownerEmail(env))) {
    // Deliberately generic message: do not reveal whether the owner email differs
    // in local-part vs domain, and give an attacker nothing to enumerate.
    throw new ConvexError("closed owner: this deployment accepts a single owner account");
  }
}

/**
 * Gate account creation. Only the `signUp` flow creates an account; it is refused
 * unless a valid one-time bootstrap secret is presented. All other flows pass
 * through (their account must already exist and the allowlist already applied).
 */
export function assertBootstrapAllowed(
  params: { flow?: unknown; secret?: unknown },
  env: Record<string, string | undefined> = process.env,
): void {
  if (params.flow !== "signUp") return;

  const configured = env.OWNER_BOOTSTRAP_SECRET;
  if (!configured) {
    throw new ConvexError(
      "sign-up is disabled: no OWNER_BOOTSTRAP_SECRET is configured (the owner account already exists or bootstrap is closed)",
    );
  }
  const provided = typeof params.secret === "string" ? params.secret : "";
  if (!provided || !constantTimeEqual(provided, configured)) {
    throw new ConvexError("sign-up refused: invalid bootstrap secret");
  }
}

/**
 * The Password provider `profile` callback body. Runs for EVERY flow before any
 * flow-specific credential logic, so both rules apply pre-credential. Returns the
 * `users` row fields (email only — no roles, no self-service profile data).
 */
export function ownerProfile(
  params: Record<string, unknown>,
  env: Record<string, string | undefined> = process.env,
): { email: string } {
  const email = normalizeEmail(params.email);
  assertOwnerAllowed(email, env);
  assertBootstrapAllowed(params, env);
  return { email };
}
