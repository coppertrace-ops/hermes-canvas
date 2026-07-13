/**
 * Readership instrumentation wiring (OWNER: CHRONICLE, plan §3, §8 G4, §10).
 *
 * A tiny React context carrying a `MetricsSink`, plus a `useReadership` hook that
 * exposes typed emitters for the instrumented reader actions (diff opens, badge
 * clicks, restores, first-views, merge interactions). Components call these; the
 * sink is supplied by integration (Convex `metrics.recordEvent`) or by a test.
 * The event vocabulary and `at`-stamping stay honest by going through the pure
 * `@hermes/diff` types. `first-view` timing is computed here from the write time.
 */

import { NOOP_METRICS_SINK } from "@hermes/diff";
import type { MetricsEvent, MetricsSink } from "@hermes/diff";
import { createContext, useContext, useMemo } from "react";

export const MetricsContext = createContext<MetricsSink>(NOOP_METRICS_SINK);

/** Provide a metrics sink to the history subtree. */
export const MetricsProvider = MetricsContext.Provider;

/** Access the raw sink (rarely needed; prefer `useReadership`). */
export function useMetricsSink(): MetricsSink {
  return useContext(MetricsContext);
}

/**
 * Typed readership emitters. `now` is injectable for tests; defaults to
 * `Date.now`. Each emitter records a validated `MetricsEvent` through the sink.
 */
export interface Readership {
  diffOpened(input: { artifactId: string; fromSeq?: number; seq: number }): void;
  badgeClicked(input: { artifactId?: string; tabId?: string }): void;
  restorePerformed(input: { artifactId: string; seq: number }): void;
  /** Records the first view of an artifact after an agent write landed at `writeAt`. */
  artifactFirstViewed(input: { artifactId: string; seq: number; writeAt?: number }): void;
  mergePromptOpened(input: { artifactId: string; seq: number }): void;
  mergeResolved(input: { artifactId: string; seq: number; resolution: string }): void;
}

export function useReadership(now: () => number = Date.now): Readership {
  const sink = useMetricsSink();
  return useMemo<Readership>(() => {
    const emit = (e: Omit<MetricsEvent, "at">) => sink.record({ ...e, at: now() });
    return {
      diffOpened: ({ artifactId, fromSeq, seq }) =>
        emit({ kind: "diff_opened", artifactId, fromSeq, seq }),
      badgeClicked: ({ artifactId, tabId }) => emit({ kind: "badge_clicked", artifactId, tabId }),
      restorePerformed: ({ artifactId, seq }) =>
        emit({ kind: "restore_performed", artifactId, seq }),
      artifactFirstViewed: ({ artifactId, seq, writeAt }) =>
        emit({
          kind: "artifact_first_viewed",
          artifactId,
          seq,
          timeToFirstViewMs: writeAt !== undefined ? Math.max(0, now() - writeAt) : undefined,
        }),
      mergePromptOpened: ({ artifactId, seq }) =>
        emit({ kind: "merge_prompt_opened", artifactId, seq }),
      mergeResolved: ({ artifactId, seq, resolution }) =>
        emit({ kind: "merge_resolved", artifactId, seq, resolution }),
    };
  }, [sink, now]);
}
