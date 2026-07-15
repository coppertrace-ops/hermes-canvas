/**
 * Pure formatting helpers for the Settings view (PROOF integration, Wave 2).
 *
 * Kept side-effect-free and clock-injected so every derived string is unit-testable
 * and renders identically in tests (`renderToStaticMarkup`) and live. No React here.
 */

/** Past this age an agent status report is treated as stale (mirrors jobs overdue). */
export const AGENT_STALE_AFTER_MS = 10 * 60_000;

export interface Staleness {
  /** Human "Reported Xs/Xm ago" line. */
  label: string;
  /** True once the report is older than {@link AGENT_STALE_AFTER_MS}. */
  stale: boolean;
  /** Raw age in ms (never negative — a future timestamp clamps to 0). */
  ageMs: number;
}

/**
 * Compact relative age: "just now", "5s ago", "3m ago", "2h ago", "4d ago". A
 * report timestamped in the future (clock skew) reads as "just now", never a
 * negative age.
 */
export function formatAge(reportedAt: number, now: number): string {
  const ageMs = Math.max(0, now - reportedAt);
  const s = Math.floor(ageMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** The full staleness signal for the "Reported …" line and its warning tone. */
export function staleness(reportedAt: number, now: number): Staleness {
  const ageMs = Math.max(0, now - reportedAt);
  return {
    label: `Reported ${formatAge(reportedAt, now)}`,
    stale: ageMs > AGENT_STALE_AFTER_MS,
    ageMs,
  };
}

/**
 * Human byte size for the limits table: "256 KiB", "10 MiB", "512 B". Binary
 * units, matching how the contract measures caps (UTF-8 byte length over KiB/MiB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${trimUnit(kib)} KiB`;
  const mib = kib / 1024;
  return `${trimUnit(mib)} MiB`;
}

/** Drop a trailing ".0" so whole values read "256 KiB", not "256.0 KiB". */
function trimUnit(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** A count of items with a singular/plural noun: "1 memory", "3 memories". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
