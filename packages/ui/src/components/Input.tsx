import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "../util";

export type InputSize = "sm" | "md";

interface CommonInputProps {
  size?: InputSize;
  /**
   * Error state. Sets `aria-invalid` and the danger ring/border, so validity is
   * never signalled by colour alone — assistive tech reads the invalid state and
   * the caller pairs it with a visible message.
   */
  invalid?: boolean;
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    CommonInputProps {}

/**
 * Single-line text input primitive. Honest focus/disabled/error states, all in
 * tokens: a visible focus ring, dimmed disabled surface, danger border + ring
 * when `invalid`. Uncontrolled or controlled — it is a thin styled `<input>`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        "hc-input",
        size !== "md" && `hc-input--${size}`,
        invalid && "hc-input--invalid",
        className,
      )}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    CommonInputProps {}

/**
 * Multi-line variant of {@link Input}. Same look and states; grows via the
 * caller's `rows`/CSS and never collapses below a legible min-height.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = "md", invalid = false, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        "hc-input",
        "hc-input--textarea",
        size !== "md" && `hc-input--${size}`,
        invalid && "hc-input--invalid",
        className,
      )}
      {...rest}
    />
  );
});
