import { describe, expect, it } from "vitest";
import { requireOwner } from "./authGuard";

/**
 * Owner-guard tests (OWNER: ATLAS, plan §6 / Gate G0).
 *
 * The load-bearing property: a DEPLOYED (production) owner environment can never
 * run un-authenticated, regardless of the demo bypass flag. The bypass is honored
 * only in non-production with explicit opt-in.
 */

const withIdentity = { auth: { getUserIdentity: async () => ({ subject: "owner|1" }) } };
const noIdentity = { auth: { getUserIdentity: async () => null } };

describe("requireOwner", () => {
  it("permits a request that carries an authenticated identity", async () => {
    await expect(requireOwner(withIdentity, { NODE_ENV: "production" })).resolves.toBeUndefined();
  });

  it("rejects an unauthenticated request in a normal (no-bypass) environment", async () => {
    await expect(requireOwner(noIdentity, { NODE_ENV: "development" })).rejects.toThrow(
      /owner sign-in required/,
    );
  });

  it("refuses the demo bypass in production even when it is explicitly set", async () => {
    await expect(
      requireOwner(noIdentity, { NODE_ENV: "production", DEMO_AUTH_BYPASS: "true" }),
    ).rejects.toThrow(/owner sign-in required/);
    await expect(
      requireOwner(noIdentity, { VERCEL_ENV: "production", DEMO_AUTH_BYPASS: "true" }),
    ).rejects.toThrow(/owner sign-in required/);
  });

  it("honors the demo bypass only in non-production with explicit opt-in", async () => {
    await expect(
      requireOwner(noIdentity, { NODE_ENV: "development", DEMO_AUTH_BYPASS: "true" }),
    ).resolves.toBeUndefined();
    // Non-production but not opted in ⇒ still rejected.
    await expect(requireOwner(noIdentity, { NODE_ENV: "development" })).rejects.toThrow(
      /owner sign-in required/,
    );
  });
});
