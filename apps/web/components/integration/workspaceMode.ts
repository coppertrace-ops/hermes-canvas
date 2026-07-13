/**
 * Workspace liveness resolution + honest banner copy (OWNER: PROOF integration).
 *
 * The single rule for whether the shell shows LIVE Hermes state or the labeled
 * DEMO seed. Kept pure (no React, no Convex) so the "never mislabel demo as live"
 * guarantee is unit-tested directly. The invariant the tests enforce:
 *   - `mode === "live"` ⇒ the banner is a live banner (never the word "Demo").
 *   - `mode === "demo"` ⇒ the banner is a demo banner (never claims "Live").
 * Demo data is therefore impossible to dress up as live agent output.
 */

export type WorkspaceMode = "loading" | "demo" | "live";

export interface LiveDataProbe {
  /** A Convex client is mounted (live hooks are safe to call). */
  hasConvex: boolean;
  /** False while the artifact-list query is still resolving (`undefined`). */
  loaded: boolean;
  /** Count of active artifacts in the live deployment. */
  artifactCount: number;
  /**
   * The initial connect budget has elapsed without the probe resolving. When true
   * we stop showing the connecting state and fall back to the labeled demo — the
   * live query keeps trying, so a later resolution still upgrades to live.
   */
  connectTimedOut?: boolean;
}

/**
 * Decide the workspace mode from a probe of live state.
 *
 * No Convex client → always the local demo. Convex present and the probe resolved
 * with data → live; resolved but empty → demo (honestly "connected, no data yet").
 * Still resolving → a brief connecting state, then the labeled demo once the
 * connect budget elapses, so a slow/unreachable deployment never blocks the UI on
 * a spinner (a later resolution still upgrades to live).
 */
export function resolveWorkspaceMode(probe: LiveDataProbe): WorkspaceMode {
  if (!probe.hasConvex) return "demo";
  if (probe.loaded) return probe.artifactCount > 0 ? "live" : "demo";
  return probe.connectTimedOut ? "demo" : "loading";
}

export interface BannerCopy {
  tone: WorkspaceMode;
  /** Short status word shown in the header + banner. */
  label: string;
  /** Body sentence — the honest description of what the user is looking at. */
  detail: string;
}

/**
 * The banner + status copy for a mode. `connected` distinguishes the two demo
 * cases: no Convex at all vs. Convex connected but with no live data yet.
 */
export function bannerFor(mode: WorkspaceMode, connected: boolean): BannerCopy {
  switch (mode) {
    case "live":
      return {
        tone: "live",
        label: "Live Hermes data",
        detail:
          "chat, canvas, and version history are backed by Convex live queries and mutations.",
      };
    case "loading":
      return {
        tone: "loading",
        label: "Connecting",
        detail: "connecting to the live Hermes workspace…",
      };
    case "demo":
    default:
      return connected
        ? {
            tone: "demo",
            label: "Demo data",
            detail:
              "connected to Hermes, but there is no live workspace data yet — this is illustrative demo content, not live state.",
          }
        : {
            tone: "demo",
            label: "Demo data",
            detail:
              "illustrative content for the Wave 1 integration preview, not live Hermes state. Chat replies, versions, and diffs are seeded locally.",
          };
  }
}
