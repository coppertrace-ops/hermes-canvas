/**
 * @hermes/diff — semantic diff engine + legibility core (CHRONICLE, plan §3, §7).
 *
 * The product-thesis core: block/word Markdown diff, Mermaid before/after,
 * board card-level semantic diff, HTML source diff; the version-timeline model
 * (author / why / resolved_action / contended per version); the append-only
 * restore model; changed-since-you-last-looked logic; the contended-write merge
 * prompt model; and the readership-test instrumentation vocabulary.
 *
 * Everything here is pure and typed. The Convex functions (`lastSeen.ts`,
 * `metrics.ts`) and the `apps/web/components/history` React components consume
 * these functions through adapters — no business logic lives in the UI, and the
 * whole engine is unit-testable without a browser or a Convex deployment.
 */

export const DIFF_VERSION = "1.0.0-p4" as const;

/** Diff kinds the engine supports (plan §3). */
export type DiffKind = "markdown" | "mermaid" | "board" | "html-static";

// --- Generic sequence diff ---------------------------------------------------
export { diffSequences, groupOps, statOf } from "./sequences";
export type { EditOp, EditRun, EqualityFn, DiffStat } from "./sequences";

// --- Text (line + word) ------------------------------------------------------
export { diffLines, diffWords, tokenizeWords, joinSide } from "./text";
export type { WordToken, LineDiff, LineHunk, LineDiffLine } from "./text";

// --- Markdown structural diff ------------------------------------------------
export { diffMarkdown, segmentBlocks } from "./markdown";
export type { MarkdownDiff, MarkdownBlock, MarkdownBlockDiff, BlockKind } from "./markdown";

// --- Mermaid -----------------------------------------------------------------
export { diffMermaid } from "./mermaid";
export type { MermaidDiff, MermaidDiffInput, MermaidRenderSide } from "./mermaid";

// --- Board -------------------------------------------------------------------
export { diffBoard } from "./board";
export type { BoardDiff, CardChange, ColumnChange } from "./board";

// --- HTML --------------------------------------------------------------------
export { diffHtml } from "./html";
export type { HtmlDiff, HtmlDiffInput, HtmlPreviewSide } from "./html";

// --- Artifact-level dispatch -------------------------------------------------
export { diffArtifact, buildHeader } from "./artifact";
export type {
  ArtifactDiff,
  ArtifactDiffBody,
  DiffHeader,
  DiffVersionInput,
  ChangeScope,
} from "./artifact";

// --- Version timeline --------------------------------------------------------
export { buildVersionTimeline, checkChainIntegrity } from "./timeline";
export type { VersionTimeline, TimelineEntry } from "./timeline";

// --- Restore (append-only) ---------------------------------------------------
export { previewRestore, verifyRestoreAppended } from "./restore";
export type { RestorePreview } from "./restore";

// --- Changed-since-last-looked -----------------------------------------------
export {
  SEEN_DWELL_MS,
  isArtifactChanged,
  artifactChanged,
  aggregateTabChanged,
  totalChanged,
  shouldMarkSeen,
  nextLastSeen,
  artifactBadge,
  tabBadge,
} from "./changed";
export type { HasHead, LastSeenMap, ChangedBadgeModel } from "./changed";

// --- Contended merge prompt --------------------------------------------------
export { buildMergePrompt, contendedVersions } from "./merge";
export type { MergePrompt, MergeResolution } from "./merge";

// --- Readership instrumentation ----------------------------------------------
export {
  isValidMetricsEvent,
  summarizeReadership,
  NOOP_METRICS_SINK,
  InMemoryMetricsSink,
} from "./metrics";
export type { MetricsEvent, MetricsEventKind, MetricsSink, ReadershipSummary } from "./metrics";
