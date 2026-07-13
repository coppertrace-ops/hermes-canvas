import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../util";

export type IconButtonVariant = "ghost" | "solid";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /**
   * Required accessible label. An icon-only control MUST name itself for screen
   * readers — the type system enforces it here rather than leaving it optional.
   */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

/** Square, icon-only button. `label` becomes both `aria-label` and `title`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "hc-icon-btn",
        variant === "solid" && "hc-icon-btn--solid",
        size !== "md" && `hc-icon-btn--${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
