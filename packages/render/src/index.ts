/**
 * @hermes/render — canvas renderers + shell primitives (PANES, plan §7).
 *
 * Safe content renderers (Markdown with no raw-HTML pass-through and a visible
 * external-image-blocked state; strict Mermaid with inline parse-error + raw
 * source), the resizable split-pane primitive, the changed-since-last-looked
 * badge, honest artifact empty/loading/error states, and the canvas
 * data-adapter interface that later integration implements against Convex.
 *
 * OWNERSHIP: PANES. Consumers file change requests here rather than patching
 * in place (plan §7 interface rule).
 */

export const RENDER_VERSION = "0.1.0-p3" as const;

// --- Markdown ----------------------------------------------------------------
export { Markdown } from "./markdown/Markdown";
export type { MarkdownProps } from "./markdown/Markdown";
export { parseMarkdown, parseInline } from "./markdown/sanitize";
export {
  DEFAULT_MARKDOWN_POLICY,
} from "./markdown/types";
export type {
  MarkdownPolicy,
  BlockReason,
  BlockNode,
  InlineNode,
  HeadingNode,
  ParagraphNode,
  CodeBlockNode,
  ListNode,
  BlockquoteNode,
  ThematicBreakNode,
  TableNode,
  TableAlign,
  TextNode,
  EmphasisNode,
  CodeSpanNode,
  LinkNode,
  ImageNode,
} from "./markdown/types";

// --- Mermaid -----------------------------------------------------------------
export { Mermaid } from "./mermaid/Mermaid";
export type { MermaidProps } from "./mermaid/Mermaid";
export { STRICT_MERMAID_CONFIG, loadStrictMermaidEngine } from "./mermaid/engine";
export type {
  MermaidEngine,
  MermaidRenderOutcome,
  MermaidRenderSuccess,
  MermaidRenderFailure,
} from "./mermaid/engine";

// --- Layout ------------------------------------------------------------------
export { SplitPane } from "./layout/SplitPane";
export type { SplitPaneProps } from "./layout/SplitPane";
export { useResizablePane } from "./layout/useResizablePane";
export type {
  UseResizablePaneOptions,
  ResizablePane,
  SeparatorProps,
  PaneOrientation,
} from "./layout/useResizablePane";

// --- Legibility --------------------------------------------------------------
export { ChangedBadge } from "./badge/ChangedBadge";
export type { ChangedBadgeProps } from "./badge/ChangedBadge";

// --- Artifact states ---------------------------------------------------------
export { ArtifactLoading, ArtifactError, ArtifactEmpty } from "./artifact/ArtifactStates";
export type {
  ArtifactLoadingProps,
  ArtifactErrorProps,
  ArtifactEmptyProps,
} from "./artifact/ArtifactStates";

// --- Data-adapter interface --------------------------------------------------
export type {
  CanvasDataAdapter,
  CanvasActions,
  CanvasTabView,
  CanvasArtifactView,
  ArtifactVersionView,
  ArtifactContentState,
} from "./adapter/types";
