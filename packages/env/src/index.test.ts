import { describe, expect, it } from "vitest";
import { isDemoBypassEnabled, DEMO_OWNER_IDENTITY } from "./index.js";
import { parseClientEnv } from "./client.js";

describe("isDemoBypassEnabled", () => {
  it("is disabled by default", () => {
    expect(isDemoBypassEnabled({})).toBe(false);
  });

  it("is honored only in non-production with explicit opt-in", () => {
    expect(isDemoBypassEnabled({ NODE_ENV: "development", DEMO_AUTH_BYPASS: "true" })).toBe(true);
    expect(isDemoBypassEnabled({ NODE_ENV: "production", DEMO_AUTH_BYPASS: "true" })).toBe(false);
    expect(isDemoBypassEnabled({ VERCEL_ENV: "production", DEMO_AUTH_BYPASS: "true" })).toBe(false);
  });

  it("exposes a synthetic (non-credential) demo identity", () => {
    expect(DEMO_OWNER_IDENTITY.email).toContain("@localhost");
  });
});

describe("parseClientEnv", () => {
  it("accepts a valid convex url and rejects a bad one", () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_CONVEX_URL: "https://acoustic-hedgehog-123.convex.cloud" }),
    ).not.toThrow();
    expect(() => parseClientEnv({ NEXT_PUBLIC_CONVEX_URL: "https://example.com" })).toThrow();
  });
});
