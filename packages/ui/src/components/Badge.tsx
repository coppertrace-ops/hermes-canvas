import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";
import type { StatusTone } from "../tokens";

export type BadgeVariant = "subtle" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

/**
 * Compact status/count label. `subtle` is the restrained default; `solid` is for
 * counts that must pop (e.g. an unread total). Tone vocabulary is shared with
 * StatusDot so "danger" means the same thing everywhere.
 */
export function Badge({
  tone = "neutral",
  variant = "subtle",
  size = "md",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        "hc-badge",
        `hc-badge--${variant}`,
        `hc-badge--${tone}`,
        size !== "md" && `hc-badge--${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
