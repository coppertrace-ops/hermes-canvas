import type { HTMLAttributes } from "react";
import { cx } from "../util";

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Accessible label; announced to assistive tech. Defaults to "Loading". */
  label?: string;
}

/**
 * A minimal indeterminate spinner. Sizes to `1em`, so it inherits the font size
 * of its context (e.g. inside a Button). Under reduced-motion it slows, never
 * hiding — an honest "working" signal.
 */
export function Spinner({ label = "Loading", className, ...rest }: SpinnerProps) {
  return (
    <span
      className={cx("hc-spinner", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...rest}
    />
  );
}
