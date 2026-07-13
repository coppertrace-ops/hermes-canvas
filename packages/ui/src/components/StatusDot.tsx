import type { HTMLAttributes } from "react";
import { cx } from "../util";
import type { StatusTone } from "../tokens";

export type StatusDotSize = "sm" | "md" | "lg";

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status?: StatusTone;
  size?: StatusDotSize;
  /** Ripple to signal a live/active state (e.g. streaming, running job). */
  pulse?: boolean;
  /**
   * Accessible label. When provided the dot becomes `role="img"` and names
   * itself; without it the dot is decorative (`aria-hidden`) and meaning must
   * come from adjacent text.
   */
  label?: string;
}

/**
 * A single status indicator. Deliberately meaning-carrying: pair it with a label
 * (or nearby text) so state is never conveyed by color alone.
 */
export function StatusDot({
  status = "neutral",
  size = "md",
  pulse = false,
  label,
  className,
  ...rest
}: StatusDotProps) {
  return (
    <span
      className={cx(
        "hc-status-dot",
        `hc-status-dot--${status}`,
        size !== "md" && `hc-status-dot--${size}`,
        pulse && "hc-status-dot--pulse",
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}
