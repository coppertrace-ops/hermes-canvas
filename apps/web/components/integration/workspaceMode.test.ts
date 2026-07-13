import { describe, expect, it } from "vitest";
import { bannerFor, resolveWorkspaceMode } from "./workspaceMode";
import type { WorkspaceMode } from "./workspaceMode";

/**
 * Live-adapter fallback labeling tests (OWNER: PROOF).
 *
 * The core honesty guarantee of the live bridge: the shell shows LIVE Hermes data
 * only when a Convex client is mounted AND the deployment actually has data;
 * otherwise it shows the DEMO seed, and the banner NEVER dresses demo content up
 * as live. These pin both the mode-resolution rule and the banner copy so a future
 * change can't silently mislabel demo data.
 */

describe("resolveWorkspaceMode", () => {
  it("is demo whenever there is no Convex client, regardless of counts", () => {
    expect(resolveWorkspaceMode({ hasConvex: false, loaded: false, artifactCount: 0 })).toBe("demo");
    expect(resolveWorkspaceMode({ hasConvex: false, loaded: true, artifactCount: 9 })).toBe("demo");
  });

  it("is live only when Convex is connected and data has loaded", () => {
    expect(resolveWorkspaceMode({ hasConvex: true, loaded: true, artifactCount: 1 })).toBe("live");
    expect(resolveWorkspaceMode({ hasConvex: true, loaded: true, artifactCount: 42 })).toBe("live");
  });

  it("falls back to demo when connected but the deployment is empty", () => {
    expect(resolveWorkspaceMode({ hasConvex: true, loaded: true, artifactCount: 0 })).toBe("demo");
  });

  it("shows the connecting state until the probe resolves, then demo on timeout", () => {
    expect(resolveWorkspaceMode({ hasConvex: true, loaded: false, artifactCount: 0 })).toBe(
      "loading",
    );
    expect(
      resolveWorkspaceMode({
        hasConvex: true,
        loaded: false,
        artifactCount: 0,
        connectTimedOut: true,
      }),
    ).toBe("demo");
  });

  it("upgrades to live once data arrives even after a connect timeout", () => {
    expect(
      resolveWorkspaceMode({
        hasConvex: true,
        loaded: true,
        artifactCount: 3,
        connectTimedOut: true,
      }),
    ).toBe("live");
  });
});

describe("bannerFor — never mislabels demo as live", () => {
  const modes: WorkspaceMode[] = ["live", "demo", "loading"];

  it("labels the live banner as live and never as demo", () => {
    const live = bannerFor("live", true);
    expect(live.tone).toBe("live");
    expect(live.label.toLowerCase()).toContain("live");
    expect(`${live.label} ${live.detail}`.toLowerCase()).not.toContain("demo");
  });

  it("labels both demo cases as demo and never claims to be live", () => {
    for (const connected of [true, false]) {
      const demo = bannerFor("demo", connected);
      expect(demo.tone).toBe("demo");
      expect(demo.label.toLowerCase()).toContain("demo");
      // The word "live" only ever appears as "not live"/"no live data", never a claim.
      expect(demo.label.toLowerCase()).not.toContain("live");
    }
  });

  it("distinguishes the two demo cases honestly", () => {
    const offline = bannerFor("demo", false).detail;
    const connectedEmpty = bannerFor("demo", true).detail;
    expect(offline).not.toBe(connectedEmpty);
    expect(connectedEmpty.toLowerCase()).toContain("no live");
  });

  it("the banner tone always matches the requested mode", () => {
    for (const mode of modes) {
      expect(bannerFor(mode, true).tone).toBe(mode);
    }
  });
});
