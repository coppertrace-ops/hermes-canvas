"use client";

/**
 * Live history adapter (OWNER: PROOF integration).
 *
 * The Convex-backed twin of CHRONICLE's `useMockHistoryAdapter`, satisfying the
 * same {@link HistoryAdapter} seam so `HistoryPanel` renders identically. It reads
 * the full append-only version chain of the active artifact through the new
 * `canvas.versionChain` query, performs restore/merge as real append-only writes
 * via `canvas.restoreArtifact`, and records readership events through the
 * `metrics.recordEvent` mutation. Business logic stays in `@hermes/diff`.
 */

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import type { MetricsEvent, MetricsSink } from "@hermes/diff";
import { api } from "../../convex/_generated/api";
import type { HistoryAdapter, HistoryLoad } from "../history";

export function useConvexHistoryAdapter(artifactId: string | null): HistoryAdapter {
  const chain = useQuery(
    api.canvas.versionChain,
    artifactId ? { artifact_id: artifactId } : "skip",
  );
  const restoreMut = useMutation(api.canvas.restoreArtifact);
  const recordEventMut = useMutation(api.metrics.recordEvent);

  const metrics = useMemo<MetricsSink>(
    () => ({
      record: (event: MetricsEvent) => {
        void recordEventMut({
          kind: event.kind,
          artifact_id: event.artifactId,
          tab_id: event.tabId,
          seq: event.seq,
          from_seq: event.fromSeq,
          time_to_first_view_ms: event.timeToFirstViewMs,
          resolution: event.resolution,
        });
      },
    }),
    [recordEventMut],
  );

  const load: HistoryLoad = !artifactId
    ? { status: "empty" }
    : chain === undefined
      ? { status: "loading" }
      : chain === null
        ? { status: "empty" }
        : {
            status: "ready",
            data: {
              artifactId: chain.artifact.artifact_id,
              type: chain.artifact.type,
              title: chain.artifact.title,
              versions: chain.versions,
              headSeq: chain.head_seq,
            },
          };

  const adapter: HistoryAdapter = {
    load,
    metrics,
    actions: {
      restore: async (aid, seq, why) => {
        await restoreMut({ artifact_id: aid, seq, why });
      },
      resolveMerge: async (aid, contendedSeq, resolution) => {
        // Only `take_contended` produces an append-only write; keep_head / manual
        // are recorded by the metrics sink at the call site, not here.
        if (resolution === "take_contended") {
          await restoreMut({
            artifact_id: aid,
            seq: contendedSeq,
            why: `take contended v${contendedSeq}`,
          });
        }
      },
      markSeen: () => {},
    },
  };

  return adapter;
}
