/**
 * History subsystem view-models + the data-adapter seam (OWNER: CHRONICLE, plan
 * §3, §7).
 *
 * Every component here is pure UI: it reads a `HistoryData` snapshot and invokes
 * `HistoryActions` callbacks through this seam, and it emits readership events
 * through a `MetricsSink`. Nothing imports Convex directly, so the whole surface
 * renders identically against the in-memory mock (`mockHistory.ts`) in tests and
 * against live Convex queries/mutations at integration — mirroring the
 * COURIER/PANES adapter pattern. Business logic lives in `@hermes/diff`; the
 * components carry none.
 */

import type { ArtifactType, ArtifactVersion } from "@hermes/contract";
import type { MetricsSink } from "@hermes/diff";

/** The append-only history of one artifact, as delivered by the read query. */
export interface HistoryData {
  artifactId: string;
  type: ArtifactType;
  title: string;
  /** Full version chain (each carries its content, why, resolved_action, …). */
  versions: ArtifactVersion[];
  /** Current head seq (the mutable pointer; every version below is immutable). */
  headSeq: number;
}

/** Async wrapper so the panel can show honest loading / error / empty states. */
export type HistoryLoad =
  | { status: "loading" }
  | { status: "error"; message: string; retry?: () => void }
  | { status: "empty" }
  | { status: "ready"; data: HistoryData };

/** UI → integration callbacks. All are safe (append-only) per plan §3. */
export interface HistoryActions {
  /**
   * Restore an old version's content as a NEW head version (append-only). The
   * integration wires this to `canvas.restoreArtifact` (LEDGER); the UI only ever
   * confirms and calls it.
   */
  restore(artifactId: string, seq: number, why: string): void | Promise<void>;
  /** Mark the artifact seen up to `seq` (defaults head), clearing its badge. */
  markSeen?(artifactId: string, seq?: number): void;
  /**
   * Resolve a contended merge. `take_contended` restores the contended version's
   * content as a new head; `keep_head` records the decision; `manual` opens the
   * editor seeded from the chosen side. All resolutions are append-only writes.
   */
  resolveMerge?(artifactId: string, contendedSeq: number, resolution: string): void | Promise<void>;
}

/** The full read+write+instrument seam the history surface consumes. */
export interface HistoryAdapter {
  load: HistoryLoad;
  actions: HistoryActions;
  /** Readership instrumentation. Defaults to a no-op sink when absent. */
  metrics?: MetricsSink;
}

/** A version paired with a friendly display index (1-based position in chain). */
export interface VersionRef {
  version: ArtifactVersion;
}
