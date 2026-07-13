import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
  assertBootstrapAllowed,
  assertOwnerAllowed,
  constantTimeEqual,
  normalizeEmail,
  ownerEmail,
  ownerProfile,
} from "./authPolicy";

/**
 * Closed-owner auth policy tests (OWNER: ATLAS, plan §6 / Gate G0).
 *
 * Proves the two security-load-bearing rules directly, without booting the full
 * Convex Auth action stack:
 *   1. Allowlist-of-one: any email other than OWNER_EMAIL is rejected in EVERY
 *      environment (there is no production bypass at the identity layer).
 *   2. No public sign-up: account creation is refused unless the one-time
 *      OWNER_BOOTSTRAP_SECRET is presented; unset secret ⇒ sign-up permanently off.
 */

const OWNER = "owner@example.com";
const prodEnv = { OWNER_EMAIL: OWNER, NODE_ENV: "production" };

/** Capture the ConvexError thrown by `fn`, or fail. */
function thrown(fn: () => unknown): ConvexError<string> {
  try {
    fn();
  } catch (e) {
    return e as ConvexError<string>;
  }
  throw new Error("expected the call to throw, but it did not");
}

describe("normalizeEmail / constantTimeEqual", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(42)).toBe("");
  });

  it("compares equal-length strings without early-out on content", () => {
    expect(constantTimeEqual("abcd", "abcd")).toBe(true);
    expect(constantTimeEqual("abcd", "abce")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});

describe("ownerEmail", () => {
  it("returns the normalized configured owner", () => {
    expect(ownerEmail({ OWNER_EMAIL: "Owner@Example.com" })).toBe(OWNER);
  });

  it("fails closed when OWNER_EMAIL is unset (never defaults to open)", () => {
    expect(() => ownerEmail({})).toThrow(ConvexError);
  });
});

describe("assertOwnerAllowed — allowlist of one", () => {
  it("permits the owner (case/whitespace-insensitive)", () => {
    expect(() => assertOwnerAllowed(normalizeEmail(" OWNER@example.com "), prodEnv)).not.toThrow();
  });

  it("rejects any other email — even in production", () => {
    expect(() => assertOwnerAllowed("intruder@example.com", prodEnv)).toThrow(ConvexError);
    // A near-miss (same domain) is still rejected: allowlist is exact.
    expect(() => assertOwnerAllowed("owner2@example.com", prodEnv)).toThrow(ConvexError);
  });

  it("does not leak which part of the email differs", () => {
    const err = thrown(() => assertOwnerAllowed("intruder@example.com", prodEnv));
    expect(err.data).toContain("single owner account");
    expect(err.data).not.toContain("intruder");
  });
});

describe("assertBootstrapAllowed — no public sign-up", () => {
  it("lets non-signUp flows through untouched", () => {
    expect(() => assertBootstrapAllowed({ flow: "signIn" }, prodEnv)).not.toThrow();
    expect(() => assertBootstrapAllowed({ flow: "reset" }, prodEnv)).not.toThrow();
  });

  it("refuses sign-up when no bootstrap secret is configured", () => {
    const err = thrown(() =>
      assertBootstrapAllowed({ flow: "signUp", secret: "anything" }, prodEnv),
    );
    expect(err).toBeInstanceOf(ConvexError);
    expect(err.data).toContain("sign-up is disabled");
  });

  it("refuses sign-up with a missing or wrong secret", () => {
    const env = { ...prodEnv, OWNER_BOOTSTRAP_SECRET: "the-one-time-secret-value-1234567890abcd" };
    expect(() => assertBootstrapAllowed({ flow: "signUp" }, env)).toThrow(ConvexError);
    expect(() => assertBootstrapAllowed({ flow: "signUp", secret: "wrong" }, env)).toThrow(
      ConvexError,
    );
  });

  it("permits sign-up only with the exact one-time secret", () => {
    const secret = "the-one-time-secret-value-1234567890abcd";
    const env = { ...prodEnv, OWNER_BOOTSTRAP_SECRET: secret };
    expect(() => assertBootstrapAllowed({ flow: "signUp", secret }, env)).not.toThrow();
  });
});

describe("ownerProfile — the provider callback", () => {
  it("returns the owner email for a valid owner sign-in", () => {
    expect(ownerProfile({ email: " Owner@Example.com ", flow: "signIn" }, prodEnv)).toEqual({
      email: OWNER,
    });
  });

  it("rejects a non-owner before any credential logic (allowlist rejection)", () => {
    expect(() => ownerProfile({ email: "intruder@example.com", flow: "signIn" }, prodEnv)).toThrow(
      ConvexError,
    );
  });

  it("rejects owner sign-up in production without the bootstrap secret", () => {
    expect(() => ownerProfile({ email: OWNER, flow: "signUp" }, prodEnv)).toThrow(ConvexError);
  });
});
