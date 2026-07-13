/**
 * Readership-test instrumentation (plan §3, §8 G4, §10 risk 4).
 *
 * "Instrumentation is a Phase 4 deliverable with the same priority as the diff
 * renderer itself." The 4-week readership test (options doc §6) decides whether
 * the versioning UX is worth investing in beyond a safety-floor rollback. Its
 * kill/keep signal is: unread badges + unopened diffs + write-only artifacts.
 * So we instrument exactly those: diff opens, badge clicks, restores, and
 * time-to-first-view.
 *
 * This module is the pure event vocabulary + validation + aggregation. The
 * Convex `metrics.ts` mutation records events through the {@link MetricsSink}
 * seam; the React instrumentation hook emits them. Nothing here does I/O.
 */

/** The instrumented reader actions. Extend additively — never repurpose a kind. */
export type MetricsEventKind =
  /** A diff view was opened for an artifact version pair. */
  | "diff_opened"
  /** The changed badge (per-artifact or per-tab) was clicked/activated. */
  | "badge_clicked"
  /** A restore was confirmed and performed. */
  | "restore_performed"
  /** The first time an artifact's new content was viewed after an agent write. */
  | "artifact_first_viewed"
  /** A contended merge prompt was opened. */
  | "merge_prompt_opened"
  /** A merge prompt was resolved (records the chosen resolution). */
  | "merge_resolved";

export interface MetricsEvent {
  kind: MetricsEventKind;
  /** Artifact the event concerns (absent for global/tab-level events). */
  artifactId?: string;
  /** Tab the event concerns (badge clicks may be tab-level). */
  tabId?: string;
  /** Version seq in view, when relevant. */
  seq?: number;
  /** Compared-against seq for diff opens. */
  fromSeq?: number;
  /**
   * For `artifact_first_viewed`: ms between the agent write landing and the owner
   * first seeing it — the core "do they even look?" latency (plan §10 risk 4).
   */
  timeToFirstViewMs?: number;
  /** For `merge_resolved`: the resolution chosen (`keep_head` | `take_contended` | `manual`). */
  resolution?: string;
  /** Event time (ms epoch). Supplied by the emitter so this stays pure. */
  at: number;
}

const KINDS: ReadonlySet<string> = new Set<MetricsEventKind>([
  "diff_opened",
  "badge_clicked",
  "restore_performed",
  "artifact_first_viewed",
  "merge_prompt_opened",
  "merge_resolved",
]);

/** Validate an event shape before it is recorded (defensive; the seam is typed). */
export function isValidMetricsEvent(e: unknown): e is MetricsEvent {
  if (typeof e !== "object" || e === null) return false;
  const ev = e as Record<string, unknown>;
  if (typeof ev.kind !== "string" || !KINDS.has(ev.kind)) return false;
  if (typeof ev.at !== "number" || !Number.isFinite(ev.at)) return false;
  if (
    ev.timeToFirstViewMs !== undefined &&
    (typeof ev.timeToFirstViewMs !== "number" || ev.timeToFirstViewMs < 0)
  )
    return false;
  if (ev.seq !== undefined && typeof ev.seq !== "number") return false;
  return true;
}

/**
 * The recording seam. Integration supplies a Convex-backed sink (writing to the
 * `metrics` table via a mutation); tests supply an in-memory sink. The hook and
 * components depend only on this interface, never on Convex.
 */
export interface MetricsSink {
  record(event: MetricsEvent): void;
}

/** A no-op sink for environments where instrumentation is disabled. */
export const NOOP_METRICS_SINK: MetricsSink = { record: () => {} };

/** In-memory sink for tests / local dev; keeps the ordered event log. */
export class InMemoryMetricsSink implements MetricsSink {
  readonly events: MetricsEvent[] = [];
  record(event: MetricsEvent): void {
    if (isValidMetricsEvent(event)) this.events.push(event);
  }
}

// ---------------------------------------------------------------------------
// Aggregation — the readership-test report (kill/keep signal, plan §7/§10)
// ---------------------------------------------------------------------------

export interface ReadershipSummary {
  diffOpens: number;
  badgeClicks: number;
  restores: number;
  firstViews: number;
  mergePromptsOpened: number;
  mergesResolved: number;
  /** Median ms from agent write to first view (null when no first-views yet). */
  medianTimeToFirstViewMs: number | null;
  /** Distinct artifacts whose diff was ever opened. */
  artifactsWithDiffOpened: number;
  /** Distinct artifacts that received a first-view. */
  artifactsViewed: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** Summarize a stream of events into the readership report. */
export function summarizeReadership(events: readonly MetricsEvent[]): ReadershipSummary {
  const ttfv: number[] = [];
  const diffArtifacts = new Set<string>();
  const viewedArtifacts = new Set<string>();
  let diffOpens = 0;
  let badgeClicks = 0;
  let restores = 0;
  let firstViews = 0;
  let mergePromptsOpened = 0;
  let mergesResolved = 0;

  for (const e of events) {
    switch (e.kind) {
      case "diff_opened":
        diffOpens++;
        if (e.artifactId) diffArtifacts.add(e.artifactId);
        break;
      case "badge_clicked":
        badgeClicks++;
        break;
      case "restore_performed":
        restores++;
        break;
      case "artifact_first_viewed":
        firstViews++;
        if (e.artifactId) viewedArtifacts.add(e.artifactId);
        if (typeof e.timeToFirstViewMs === "number") ttfv.push(e.timeToFirstViewMs);
        break;
      case "merge_prompt_opened":
        mergePromptsOpened++;
        break;
      case "merge_resolved":
        mergesResolved++;
        break;
    }
  }

  return {
    diffOpens,
    badgeClicks,
    restores,
    firstViews,
    mergePromptsOpened,
    mergesResolved,
    medianTimeToFirstViewMs: median(ttfv),
    artifactsWithDiffOpened: diffArtifacts.size,
    artifactsViewed: viewedArtifacts.size,
  };
}
