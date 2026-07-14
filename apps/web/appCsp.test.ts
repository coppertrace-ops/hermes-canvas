import { buildAppCsp as policyBuildAppCsp } from "@hermes/policy";
import { describe, expect, it } from "vitest";
import { appCspHostsFromEnv, buildAppCsp as mirrorBuildAppCsp } from "./appCsp.mjs";

/**
 * Drift guard: the plain-JS `appCsp.mjs` that `next.config.mjs` imports MUST be
 * byte-identical to `@hermes/policy` `buildAppCsp`. next.config can't import the
 * TS policy directly, so this test is the single-source-of-truth enforcement.
 */

const HOSTS = {
  convexCloud: "https://deft-otter-123.convex.cloud",
  convexSite: "https://deft-otter-123.convex.site",
  contentHost: "https://hermes-canvas-content.vercel.app",
};

describe("appCsp.mjs mirrors @hermes/policy buildAppCsp", () => {
  it("matches for the production posture", () => {
    expect(mirrorBuildAppCsp(HOSTS)).toBe(policyBuildAppCsp(HOSTS));
  });

  it("matches for the dev posture (HMR allowances)", () => {
    expect(mirrorBuildAppCsp(HOSTS, { dev: true })).toBe(policyBuildAppCsp(HOSTS, { dev: true }));
  });

  it("matches for demo mode (empty Convex hosts filtered)", () => {
    const demo = { convexCloud: "", convexSite: "", contentHost: HOSTS.contentHost };
    expect(mirrorBuildAppCsp(demo)).toBe(policyBuildAppCsp(demo));
  });
});

describe("prod CSP is the security floor (spec §2.3)", () => {
  const csp = policyBuildAppCsp(HOSTS);

  it("keeps the Convex WebSocket reachable", () => {
    expect(csp).toContain("wss://deft-otter-123.convex.cloud");
    expect(csp).toContain("connect-src 'self' https://deft-otter-123.convex.cloud");
  });

  it("pins frame-src to the content host and closes the image-beacon channel", () => {
    expect(csp).toContain(`frame-src ${HOSTS.contentHost}`);
    expect(csp).toContain(`img-src 'self' data: blob: ${HOSTS.convexSite}`);
    expect(csp).not.toMatch(/img-src[^;]*\*/);
  });

  it("has no unsafe-eval in production", () => {
    expect(csp).not.toContain("unsafe-eval");
  });

  it("denies object/frame-ancestors", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("appCspHostsFromEnv", () => {
  it("derives convex.site from convex.cloud and strips trailing slashes", () => {
    const hosts = appCspHostsFromEnv({
      NEXT_PUBLIC_CONVEX_URL: "https://deft-otter-123.convex.cloud/",
      NEXT_PUBLIC_CONTENT_ORIGIN: "https://c.example/",
    });
    expect(hosts.convexCloud).toBe("https://deft-otter-123.convex.cloud");
    expect(hosts.convexSite).toBe("https://deft-otter-123.convex.site");
    expect(hosts.contentHost).toBe("https://c.example");
  });

  it("empties Convex hosts in demo mode and defaults the content host", () => {
    const hosts = appCspHostsFromEnv({});
    expect(hosts.convexCloud).toBe("");
    expect(hosts.convexSite).toBe("");
    expect(hosts.contentHost).toBe("https://hermes-canvas-content.vercel.app");
  });
});
