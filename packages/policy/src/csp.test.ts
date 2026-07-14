import { describe, expect, it } from "vitest";
import { buildAppCsp, buildContentCsp } from "./csp";

const APP = "https://hermes-canvas.vercel.app";
const CONVEX_CLOUD = "https://deft-otter-123.convex.cloud";
const CONVEX_SITE = "https://deft-otter-123.convex.site";
const CONTENT = "https://hermes-canvas-content.vercel.app";

describe("buildContentCsp — the egress kill", () => {
  const csp = buildContentCsp(APP);

  it("is the exact expected string (byte-stable for header assertions)", () => {
    expect(csp).toBe(
      "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; " +
        "img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; " +
        `frame-ancestors ${APP}`,
    );
  });

  it("closes every egress channel", () => {
    expect(csp).toContain("connect-src 'none'"); // fetch/XHR/WebSocket/beacon
    expect(csp).toContain("img-src data: blob:"); // no remote image beacons
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("default-src 'none'");
  });

  it("contains NO external origins except the app frame-ancestor (no CDN allowlist)", () => {
    // The only https:// token permitted is the app origin in frame-ancestors.
    const httpsTokens = csp.match(/https:\/\/[^\s;]+/g) ?? [];
    expect(httpsTokens).toEqual([APP]);
    expect(csp).not.toContain("cdnjs");
    expect(csp).not.toContain("unpkg");
  });

  it("pins frame-ancestors to exactly the app origin", () => {
    expect(csp).toContain(`frame-ancestors ${APP}`);
  });
});

describe("buildAppCsp — app-origin hardening", () => {
  const csp = buildAppCsp({ convexCloud: CONVEX_CLOUD, convexSite: CONVEX_SITE, contentHost: CONTENT });

  it("is the exact expected string", () => {
    expect(csp).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
        `img-src 'self' data: blob: ${CONVEX_SITE}; font-src 'self'; ` +
        `connect-src 'self' ${CONVEX_CLOUD} wss://deft-otter-123.convex.cloud ${CONVEX_SITE}; ` +
        `frame-src ${CONTENT}; object-src 'none'; base-uri 'self'; form-action 'self'; ` +
        "frame-ancestors 'none'",
    );
  });

  it("keeps the Convex WebSocket reachable (wss derived from the cloud host)", () => {
    expect(csp).toContain("wss://deft-otter-123.convex.cloud");
    expect(csp).toContain(`connect-src 'self' ${CONVEX_CLOUD}`);
  });

  it("allows Convex-served images but blocks arbitrary remote images", () => {
    expect(csp).toContain(`img-src 'self' data: blob: ${CONVEX_SITE}`);
    // No wildcard image source that would re-open the markdown beacon channel.
    expect(csp).not.toMatch(/img-src[^;]*\*/);
  });

  it("pins frame-src to exactly the content host and denies being framed", () => {
    expect(csp).toContain(`frame-src ${CONTENT}`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
