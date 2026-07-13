import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../util";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and block interaction without collapsing layout. */
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * The primary action primitive. `type` defaults to "button" so it never submits
 * a form by accident. Loading is an honest state — the control stays disabled and
 * announces via the spinner rather than silently swallowing clicks.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    block = false,
    leadingIcon,
    trailingIcon,
    disabled,
    type = "button",
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cx(
        "hc-btn",
        `hc-btn--${variant}`,
        size !== "md" && `hc-btn--${size}`,
        block && "hc-btn--block",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="hc-btn__icon">
          <Spinner />
        </span>
      ) : (
        leadingIcon && <span className="hc-btn__icon">{leadingIcon}</span>
      )}
      {children}
      {trailingIcon && !loading && <span className="hc-btn__icon">{trailingIcon}</span>}
    </button>
  );
});
