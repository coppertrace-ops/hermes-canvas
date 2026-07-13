import type { CSSProperties, ReactNode } from "react";
import { useResizablePane } from "./useResizablePane";
import type { PaneOrientation } from "./useResizablePane";

/**
 * Two-pane layout with a resizable, persisted divider (PANES; plan §7).
 *
 * Generic and content-agnostic: the app composes it as chat | canvas (or any
 * pair). Sizing/persistence/interaction live in {@link useResizablePane}; this is
 * the thin presentational shell. Uncontrolled by default (persists via
 * `storageKey`); pass `fraction` + `onFractionChange` to control it.
 */
export interface SplitPaneProps {
  primary: ReactNode;
  secondary: ReactNode;
  orientation?: PaneOrientation;
  /** Persistence key for the divider position. */
  storageKey?: string;
  defaultFraction?: number;
  min?: number;
  max?: number;
  /** Accessible name for the divider handle. */
  separatorLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function SplitPane({
  primary,
  secondary,
  orientation = "horizontal",
  storageKey,
  defaultFraction,
  min,
  max,
  separatorLabel = "Resize panes",
  className,
  style,
}: SplitPaneProps) {
  const { fraction, containerRef, separatorProps, isDragging } = useResizablePane({
    storageKey,
    defaultFraction,
    min,
    max,
    orientation,
  });

  const isH = orientation === "horizontal";
  const primaryPct = `${fraction * 100}%`;

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: isH ? "row" : "column",
    // While dragging, disable text selection for a clean drag.
    userSelect: isDragging ? "none" : undefined,
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={className ? `hc-split hc-split--${orientation} ${className}` : `hc-split hc-split--${orientation}`}
      data-dragging={isDragging || undefined}
      style={containerStyle}
    >
      <div
        className="hc-split__pane hc-split__pane--primary"
        style={isH ? { width: primaryPct, minWidth: 0 } : { height: primaryPct, minHeight: 0 }}
      >
        {primary}
      </div>
      <div
        {...separatorProps}
        aria-label={separatorLabel}
        className="hc-split__separator"
        style={isH ? { cursor: "col-resize" } : { cursor: "row-resize" }}
      />
      <div className="hc-split__pane hc-split__pane--secondary" style={{ flex: "1 1 0%", minWidth: 0, minHeight: 0 }}>
        {secondary}
      </div>
    </div>
  );
}
