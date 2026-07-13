import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";

export type TextSize = "xs" | "sm" | "base" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextTone = "default" | "secondary" | "tertiary" | "accent" | "danger" | "success";
export type TextAlign = "left" | "center" | "right";

interface TextOwnProps {
  /** Element to render. Defaults to `p`. Use for semantic correctness. */
  as?: ElementType;
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  align?: TextAlign;
  /** Render in the monospace stack (code, ids, seq numbers). */
  mono?: boolean;
  /** Single-line ellipsis truncation. */
  truncate?: boolean;
  className?: string;
  children?: ReactNode;
}

export type TextProps = TextOwnProps &
  Omit<HTMLAttributes<HTMLElement>, keyof TextOwnProps | "color">;

/**
 * The type primitive. Everything text-shaped composes from this so size/weight/
 * tone stay tokenized and consistent across Courier / Panes / Chronicle.
 */
export function Text({
  as: Tag = "p",
  size = "base",
  weight = "regular",
  tone = "default",
  align,
  mono = false,
  truncate = false,
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={cx(
        "hc-text",
        `hc-text--${size}`,
        `hc-text--${weight}`,
        `hc-text--${tone}`,
        align && `hc-text--${align}`,
        mono && "hc-text--mono",
        truncate && "hc-text--truncate",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const HEADING_SIZE: Record<1 | 2 | 3 | 4, TextSize> = {
  1: "2xl",
  2: "xl",
  3: "lg",
  4: "md",
};

interface HeadingProps extends Omit<TextProps, "as" | "size" | "weight"> {
  /** Semantic level 1–4, also selecting a default size. */
  level?: 1 | 2 | 3 | 4;
  size?: TextSize;
  weight?: TextWeight;
}

/** Headings — semantic `h1`–`h4` with a tightened, restrained default scale. */
export function Heading({ level = 2, size, weight = "semibold", ...rest }: HeadingProps) {
  return (
    <Text
      as={`h${level}` as ElementType}
      size={size ?? HEADING_SIZE[level]}
      weight={weight}
      {...rest}
    />
  );
}
