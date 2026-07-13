import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";
import { InboxIcon } from "./icons";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Icon slot. Falls back to a neutral inbox glyph. Pass `null` for none. */
  icon?: ReactNode;
  /** Action slot — typically one primary Button, optionally a secondary. */
  action?: ReactNode;
  size?: "sm" | "md";
}

/**
 * An honest empty state: says what's absent and offers the next step. Used for
 * "no messages yet", "no versions", "nothing scheduled" — never a blank pane.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  size = "md",
  className,
  ...rest
}: EmptyStateProps) {
  const glyph = icon === undefined ? <InboxIcon /> : icon;
  return (
    <div className={cx("hc-empty", size === "sm" && "hc-empty--sm", className)} {...rest}>
      {glyph != null && <div className="hc-empty__icon">{glyph}</div>}
      <p className="hc-empty__title">{title}</p>
      {description != null && <p className="hc-empty__description">{description}</p>}
      {action != null && <div className="hc-empty__actions">{action}</div>}
    </div>
  );
}
