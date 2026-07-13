import { forwardRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";

interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Container for {@link Tab}s. Wires `role="tablist"` for assistive tech. */
export function TabList({ className, children, ...rest }: TabListProps) {
  return (
    <div role="tablist" className={cx("hc-tablist", className)} {...rest}>
      {children}
    </div>
  );
}

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (active) state — drives the accent underline + `aria-selected`. */
  selected?: boolean;
  icon?: ReactNode;
  /** Trailing slot, e.g. a change Badge or StatusDot. */
  trailing?: ReactNode;
}

/**
 * A single tab. Presentational: the parent owns selection state and passes
 * `selected` + `onClick`. Renders as `role="tab"` so a TabList reads correctly.
 */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { selected = false, icon, trailing, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      className={cx("hc-tab", className)}
      {...rest}
    >
      {icon && <span className="hc-tab__icon">{icon}</span>}
      {children}
      {trailing}
    </button>
  );
});
