/**
 * Service-token verification for the `/agent/*` surface (OWNER: LEDGER, plan §2.1).
 *
 * This is NOT human auth (that is Convex Auth, owned by ATLAS in `auth*`). It
 * gates exactly the agent HTTP surface with a 256-bit bearer token, compared in
 * constant time. Both sides are SHA-256 hashed before comparison, so the compare
 * is over fixed-length digests and the raw token is never string-compared.
 *
 * Env: set `HERMES_SERVICE_TOKEN_SHA256` (hex SHA-256 of the token) in the Convex
 * deployment, or `HERMES_SERVICE_TOKEN` (raw) which is hashed here. The former is
 * preferred so the plaintext token never lives in the deployment env.
 */

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The Authorization header value → the bearer token, or null. */
export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? (m[1] ?? null) : null;
}

/** Resolve the expected token hash from the deployment env (hashed form preferred). */
async function expectedHash(): Promise<string | null> {
  const stored = process.env.HERMES_SERVICE_TOKEN_SHA256;
  if (stored && stored.length === 64) return stored.toLowerCase();
  const raw = process.env.HERMES_SERVICE_TOKEN;
  if (raw) return sha256Hex(raw);
  return null;
}

/** True iff the request presents the correct service token. */
export async function verifyServiceToken(authHeader: string | null): Promise<boolean> {
  const expected = await expectedHash();
  if (!expected) return false; // no token provisioned => deny (never open)
  const token = extractBearer(authHeader);
  if (!token) return false;
  const got = await sha256Hex(token);
  return timingSafeEqualHex(got, expected);
}
