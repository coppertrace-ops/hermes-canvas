/**
 * Changed-since-you-last-looked logic (plan §3 — "the single most-requested
 * legibility feature").
 *
 * An artifact is *changed* when `head_seq > last_seen.seq`. It becomes *seen*
 * when its tab is focused and visible for ≥1s, and immediately when its diff is
 * opened; that upserts `last_seen` to the head. Badges show per-artifact and
 * aggregate per-tab as a count/dot. All of that is pure arithmetic here; the
 * Convex `lastSeen.ts` mutations and the React badges consume these functions so
 * the rule lives in exactly one place.
 */

/** Dwell threshold before a focused+visible artifact counts as "seen" (plan §3). */
export const SEEN_DWELL_MS = 1000;

export interface HasHead {
  id: string;
  tabId?: string;
  headSeq: number;
}

/** Map of artifact id → last-seen seq (0 / absent ⇒ never seen). */
export type LastSeenMap = Readonly<Record<string, number>>;

/** True when the artifact has advanced past what the owner last saw. */
export function isArtifactChanged(headSeq: number, lastSeenSeq: number | undefined): boolean {
  return headSeq > (lastSeenSeq ?? 0);
}

/** Per-artifact changed flag from a last-seen map. */
export function artifactChanged(artifact: HasHead, lastSeen: LastSeenMap): boolean {
  return isArtifactChanged(artifact.headSeq, lastSeen[artifact.id]);
}

/**
 * Aggregate changed artifacts per tab (plan §3 "aggregated per-tab as a dot").
 * Returns a map of tabId → count of changed artifacts. Artifacts without a tab
 * are grouped under the empty-string key.
 */
export function aggregateTabChanged(
  artifacts: readonly HasHead[],
  lastSeen: LastSeenMap,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of artifacts) {
    if (!artifactChanged(a, lastSeen)) continue;
    const key = a.tabId ?? "";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Total changed artifacts across everything (the global "unseen" count). */
export function totalChanged(artifacts: readonly HasHead[], lastSeen: LastSeenMap): number {
  return artifacts.reduce((n, a) => n + (artifactChanged(a, lastSeen) ? 1 : 0), 0);
}

/**
 * Decide whether a view event should mark an artifact seen. A diff-open marks
 * immediately; a focus marks only after the dwell threshold. Encodes the plan §3
 * rule so both the client dwell timer and any server-side guard agree.
 */
export function shouldMarkSeen(input: { openedDiff?: boolean; dwellMs?: number }): boolean {
  if (input.openedDiff) return true;
  return (input.dwellMs ?? 0) >= SEEN_DWELL_MS;
}

/**
 * The monotonic last-seen advance: last_seen never regresses (seeing an older
 * version must not "unsee" newer ones). Returns the seq to store, or null when no
 * write is needed because the stored value already covers the head.
 */
export function nextLastSeen(currentSeen: number | undefined, headSeq: number): number | null {
  const current = currentSeen ?? 0;
  if (headSeq <= current) return null;
  return headSeq;
}

/** Per-artifact badge model the UI feeds to `@hermes/render`'s ChangedBadge. */
export interface ChangedBadgeModel {
  changed: boolean;
  /** For a tab: number of changed artifacts. For an artifact: 1 or 0. */
  count: number;
}

export function artifactBadge(artifact: HasHead, lastSeen: LastSeenMap): ChangedBadgeModel {
  const changed = artifactChanged(artifact, lastSeen);
  return { changed, count: changed ? 1 : 0 };
}

export function tabBadge(
  tabId: string,
  artifacts: readonly HasHead[],
  lastSeen: LastSeenMap,
): ChangedBadgeModel {
  const count = aggregateTabChanged(artifacts, lastSeen)[tabId] ?? 0;
  return { changed: count > 0, count };
}
