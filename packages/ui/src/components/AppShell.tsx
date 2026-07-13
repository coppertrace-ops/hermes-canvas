import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../util";

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Top bar content (brand, tabs, ThemeToggle). Rendered in a hairline header. */
  header?: ReactNode;
  /** Optional left column. When present the shell becomes a two-column grid. */
  sidebar?: ReactNode;
  /** CSS width for the sidebar column. Defaults to 260px. */
  sidebarWidth?: string;
  /** Main region — the two-pane canvas lives here (owned by PANES). */
  children: ReactNode;
}

/**
 * The outermost application frame: a full-viewport grid with a hairline header
 * and an optional sidebar. Layout chrome only — it makes no claim about what
 * lives in `main` (chat, canvas, history are owned by other agents). Provides
 * the stable, themed scaffold those surfaces mount into.
 */
export function AppShell({
  header,
  sidebar,
  sidebarWidth = "260px",
  className,
  style,
  children,
  ...rest
}: AppShellProps) {
  const shellStyle = {
    ...(sidebar ? { ["--hc-shell-sidebar-width"]: sidebarWidth } : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx("hc-shell", sidebar != null && "hc-shell--with-sidebar", className)}
      style={shellStyle}
      {...rest}
    >
      {header != null && <header className="hc-shell__header">{header}</header>}
      {sidebar != null && <aside className="hc-shell__sidebar">{sidebar}</aside>}
      <main className="hc-shell__main">{children}</main>
    </div>
  );
}
