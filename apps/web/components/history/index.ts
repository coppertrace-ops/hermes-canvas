/**
 * History subsystem public surface (OWNER: CHRONICLE, plan §3, §7).
 *
 * The app integrates history through this barrel only. Mount `<HistoryPanel
 * adapter={…} />` with a Convex-backed `HistoryAdapter`, or use the individual
 * components (timeline, diff view, restore confirm, merge prompt) in custom
 * layouts. All rendering is driven by `@hermes/diff` (pure) through the adapter
 * seam — no Convex import lives in these components.
 */

// --- Assembled surface -------------------------------------------------------
export { HistoryPanel } from "./HistoryPanel";
export type { HistoryPanelProps } from "./HistoryPanel";

// --- Seam (adapter contract + view models) -----------------------------------
export type { HistoryAdapter, HistoryActions, HistoryData, HistoryLoad, VersionRef } from "./types";

// --- Instrumentation ---------------------------------------------------------
export { MetricsProvider, MetricsContext, useMetricsSink, useReadership } from "./instrumentation";
export type { Readership } from "./instrumentation";

// --- Timeline ----------------------------------------------------------------
export { VersionTimeline } from "./VersionTimeline";
export type { VersionTimelineProps } from "./VersionTimeline";
export { VersionMetaHeader } from "./VersionMetaHeader";
export type { VersionMetaHeaderProps } from "./VersionMetaHeader";

// --- Diff views --------------------------------------------------------------
export { DiffView } from "./DiffView";
export type { DiffViewProps, DiffMode } from "./DiffView";
export { MarkdownDiffView } from "./MarkdownDiffView";
export type { MarkdownDiffViewProps } from "./MarkdownDiffView";
export { MermaidDiffView } from "./MermaidDiffView";
export type { MermaidDiffViewProps } from "./MermaidDiffView";
export { BoardDiffView } from "./BoardDiffView";
export type { BoardDiffViewProps } from "./BoardDiffView";
export { HtmlDiffView } from "./HtmlDiffView";
export type { HtmlDiffViewProps, HtmlPreviewRenderer } from "./HtmlDiffView";
export { SourceDiff } from "./SourceDiff";
export type { SourceDiffProps } from "./SourceDiff";
export { WordTokens } from "./WordTokens";
export type { WordTokensProps } from "./WordTokens";

// --- Restore + merge ---------------------------------------------------------
export { RestoreConfirm } from "./RestoreConfirm";
export type { RestoreConfirmProps } from "./RestoreConfirm";
export { MergePrompt } from "./MergePrompt";
export type { MergePromptProps } from "./MergePrompt";

// --- Mock adapter (tests / stories) ------------------------------------------
export { buildHistoryData, useMockHistoryAdapter } from "./mockHistory";
export type { MockHistory, MockHistoryOptions } from "./mockHistory";
