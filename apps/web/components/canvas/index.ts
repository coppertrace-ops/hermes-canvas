/**
 * Canvas surface (PANES; plan §7). Tabbed canvas shell + renderers, composed
 * from `@hermes/render` primitives and `@hermes/ui`, driven by the
 * `CanvasDataAdapter` seam. Integration supplies the Convex-backed adapter and
 * mounts `CanvasShell` inside `@hermes/render`'s `SplitPane` alongside chat.
 */

export { CanvasShell } from "./CanvasShell";
export type { CanvasShellProps } from "./CanvasShell";

export { TabBar } from "./TabBar";
export type { TabBarProps } from "./TabBar";

export { ArtifactPane } from "./ArtifactPane";
export type { ArtifactPaneProps } from "./ArtifactPane";

export { HtmlArtifactHost } from "./HtmlArtifactHost";
export type { HtmlArtifactHostProps } from "./HtmlArtifactHost";

export { HtmlPreviewActivate, useHtmlPreviewRenderer } from "./HtmlPreviewActivate";
export type { HtmlPreviewActivateProps } from "./HtmlPreviewActivate";

export {
  createFrameHost,
  resolveContentOrigin,
  clampFrameHeight,
  DEFAULT_CONTENT_ORIGIN,
  FRAME_MIN_HEIGHT_PX,
  FRAME_MAX_HEIGHT_PX,
} from "./htmlFrameHost";
export type {
  FrameHostController,
  FrameHostState,
  FrameHostContent,
  HostFrameLike,
  MessageDisposition,
} from "./htmlFrameHost";
