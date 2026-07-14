/**
 * @hermes/ui — Hermes Canvas design system (GLASS, plan §7).
 *
 * Apple-calibre restraint: system type, neutral surfaces, one accent, an 8-pt
 * rhythm, hairline borders, honest empty/loading/error states, and dark/light as
 * first-class peers. Consumers (Courier / Panes / Chronicle) import primitives and
 * tokens from here; the stylesheet is imported once via "@hermes/ui/styles.css".
 *
 * OWNERSHIP: GLASS. Change requests to this surface are filed to GLASS, not
 * patched in place by consumers (plan §7 interface rule).
 */

export const UI_VERSION = "0.1.0-g0" as const;

// --- Tokens & theming --------------------------------------------------------
export * from "./tokens";
export * from "./theme";

// --- Primitives --------------------------------------------------------------
export { Text } from "./components/Typography";
export type { TextProps, TextSize, TextWeight, TextTone, TextAlign } from "./components/Typography";

export { Button } from "./components/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./components/Button";

export { IconButton } from "./components/IconButton";
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from "./components/IconButton";

export { Tab, TabList } from "./components/Tab";
export type { TabProps } from "./components/Tab";

export { Badge } from "./components/Badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./components/Badge";

export { StatusDot } from "./components/StatusDot";
export type { StatusDotProps, StatusDotSize } from "./components/StatusDot";

export { Spinner } from "./components/Spinner";

export { Panel } from "./components/Panel";
export type { PanelProps, PanelVariant, PanelPadding } from "./components/Panel";

export { EmptyState } from "./components/EmptyState";
export type { EmptyStateProps } from "./components/EmptyState";

export { Input, Textarea } from "./components/Input";
export type { InputProps, TextareaProps, InputSize } from "./components/Input";

export { AppShell } from "./components/AppShell";
export type { AppShellProps } from "./components/AppShell";

export { ThemeToggle } from "./components/ThemeToggle";
export type { ThemeToggleProps } from "./components/ThemeToggle";

// --- Icons (self-contained default set; consumers may supply their own) -------
export {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  InboxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  CloseIcon,
  PlusIcon,
} from "./components/icons";
