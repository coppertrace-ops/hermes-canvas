/**
 * @hermes/ui — token constants (GLASS, plan §7).
 *
 * The CSS custom properties in `styles/tokens.css` are the runtime source of
 * truth; this module mirrors the *scales* for programmatic use (spacing math,
 * inline styles, story/test fixtures) and exposes typed unions so consumers
 * get autocomplete + compile-time safety instead of stringly-typed props.
 *
 * `cssVar("accent")` → "var(--hc-accent)". Prefer referencing a variable over
 * inlining a value, so theme switches keep working.
 */

/** Build a `var(--hc-<name>)` reference. */
export function cssVar(name: string, fallback?: string): string {
  return fallback ? `var(--hc-${name}, ${fallback})` : `var(--hc-${name})`;
}

/** Spacing scale — an 8-pt rhythm with 4 & 2 as sub-steps. Values in rem. */
export const space = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;
export type SpaceToken = keyof typeof space;

export const radius = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;
export type RadiusToken = keyof typeof radius;

export const fontSize = {
  xs: "0.6875rem",
  sm: "0.8125rem",
  base: "0.9375rem",
  md: "1.0625rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "1.9375rem",
  "3xl": "2.5rem",
} as const;
export type FontSizeToken = keyof typeof fontSize;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
export type FontWeightToken = keyof typeof fontWeight;

export const duration = {
  fast: "120ms",
  base: "160ms",
  slow: "220ms",
} as const;
export type DurationToken = keyof typeof duration;

export const easing = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;
export type EasingToken = keyof typeof easing;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 100,
  overlay: 1000,
  modal: 1100,
  toast: 1200,
} as const;
export type ZIndexToken = keyof typeof zIndex;

/** Semantic status vocabulary shared by Badge, StatusDot, and callers. */
export const statusTones = ["neutral", "accent", "success", "warning", "danger", "info"] as const;
export type StatusTone = (typeof statusTones)[number];
