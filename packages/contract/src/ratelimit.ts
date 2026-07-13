import { CanvasError } from "./errors";
import { LIMITS } from "./limits";

/**
 * Sliding-window rate limiter (plan §2.2) — PURE.
 *
 * Thrash protection and injection blast-radius control: 20 writes/min/artifact
 * and 60 agent writes/min global. Exceeding returns a structured 429 the agent
 * can read (CanvasError.rateLimited with retry_after_ms).
 *
 * The function is stateless: callers pass the timestamps of prior writes (the
 * Convex mutation reads them from a small ledger; the in-memory core keeps arrays).
 * That keeps the decision identical on both sides and unit-testable in isolation.
 */

function windowCount(now: number, timestamps: readonly number[]): { count: number; oldestInWindow: number | null } {
  const cutoff = now - LIMITS.RATE_WINDOW_MS;
  let count = 0;
  let oldest: number | null = null;
  for (const t of timestamps) {
    if (t > cutoff) {
      count++;
      if (oldest === null || t < oldest) oldest = t;
    }
  }
  return { count, oldestInWindow: oldest };
}

/**
 * Throw CanvasError.rateLimited if this write would exceed either ceiling.
 * `recentArtifactWrites` are prior write times for the SAME artifact;
 * `recentGlobalWrites` are prior agent write times across all artifacts.
 */
export function evaluateRateLimit(
  now: number,
  recentArtifactWrites: readonly number[],
  recentGlobalWrites: readonly number[],
): void {
  const perArtifact = windowCount(now, recentArtifactWrites);
  if (perArtifact.count >= LIMITS.WRITES_PER_MIN_PER_ARTIFACT) {
    throw CanvasError.rateLimited({
      scope: "artifact",
      limit: LIMITS.WRITES_PER_MIN_PER_ARTIFACT,
      retry_after_ms: retryAfter(now, perArtifact.oldestInWindow),
    });
  }
  const global = windowCount(now, recentGlobalWrites);
  if (global.count >= LIMITS.AGENT_WRITES_PER_MIN_GLOBAL) {
    throw CanvasError.rateLimited({
      scope: "global",
      limit: LIMITS.AGENT_WRITES_PER_MIN_GLOBAL,
      retry_after_ms: retryAfter(now, global.oldestInWindow),
    });
  }
}

/** Millis until the oldest in-window write ages out and frees a slot. */
function retryAfter(now: number, oldestInWindow: number | null): number {
  if (oldestInWindow === null) return LIMITS.RATE_WINDOW_MS;
  return Math.max(1, oldestInWindow + LIMITS.RATE_WINDOW_MS - now);
}
