import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";

export type PanelVariant = "default" | "sunken" | "ghost";
export type PanelPadding = "none" | "sm" | "md" | "lg";

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: PanelVariant;
  /** Body padding. Use "none" when the body owns its own scroll/layout. */
  padding?: PanelPadding;
  /** Soft shadow lift. Off by default — restraint over decoration. */
  raised?: boolean;
  /** Header title; renders the header row when set (or when `actions` is set). */
  title?: ReactNode;
  /** Header trailing slot (buttons, badges). */
  actions?: ReactNode;
  /** Fully custom header, replacing the title/actions row. */
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * A surface container — the workhorse for panes, cards, and sidebars. Header and
 * footer are hairline-separated; the body scrolls independently so a Panel drops
 * straight into a flex/grid pane without layout surprises.
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  {
    variant = "default",
    padding = "md",
    raised = false,
    title,
    actions,
    header,
    footer,
    className,
    children,
    ...rest
  },
  ref,
) {
  const showHeader = header != null || title != null || actions != null;
  return (
    <div
      ref={ref}
      className={cx(
        "hc-panel",
        variant !== "default" && `hc-panel--${variant}`,
        raised && "hc-panel--raised",
        className,
      )}
      {...rest}
    >
      {showHeader &&
        (header ?? (
          <div className="hc-panel__header">
            {title != null && <h2 className="hc-panel__title">{title}</h2>}
            {actions != null && <div className="hc-panel__actions">{actions}</div>}
          </div>
        ))}
      <div className={cx("hc-panel__body", `hc-panel__body--${padding}`)}>{children}</div>
      {footer != null && <div className="hc-panel__footer">{footer}</div>}
    </div>
  );
});
