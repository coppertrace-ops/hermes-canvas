"use client";

/**
 * Integration shell (OWNER: PROOF).
 *
 * Composes the merged Wave 1 product from the owned subsystems' public APIs: the
 * COURIER chat pane, the PANES canvas shell, and the CHRONICLE history panel, laid
 * out in the GLASS `AppShell` with a resizable `SplitPane`, dark/light theme
 * toggle, and a Canvas/History view switch.
 *
 * It runs on LIVE Convex state whenever a Convex client is configured AND the
 * deployment actually has data, driving each surface through its real adapter seam
 * (`useConvexCanvasAdapter`, `useConvexHistoryAdapter`, `createConvexChatBackend`).
 * When there is no client, or a client but no data yet, it degrades to the
 * explicitly-labeled local demo seed. The banner always tells the truth about
 * which of the two it is — demo content is never dressed up as live Hermes state.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useConvex, useQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { AppShell, StatusDot, Text, ThemeToggle } from "@hermes/ui";
import type { StatusTone } from "@hermes/ui";
import { SplitPane } from "@hermes/render";
import type { CanvasDataAdapter } from "@hermes/render";
import { CanvasShell } from "../canvas";
import { ChatPane, ChatProvider, MockChatPane, createMockChatBackend } from "../chat";
import type { ChatBackend } from "../chat";
import { HistoryPanel, useMockHistoryAdapter } from "../history";
import type { HistoryAdapter } from "../history";
import { api } from "../../convex/_generated/api";
import { useHasConvex } from "../../app/providers";
import { FlagsProvider } from "../flags";
import { useDemoCanvasAdapter } from "./useDemoCanvasAdapter";
import { useConvexCanvasAdapter } from "./useConvexCanvasAdapter";
import { useConvexHistoryAdapter } from "./useConvexHistoryAdapter";
import { createConvexChatBackend } from "./convexChatBackend";
import { buildDemoChatItems } from "./demoSeed";
import { ReadershipPanel } from "../metrics";
import { bannerFor, resolveWorkspaceMode, type BannerCopy } from "./workspaceMode";

type View = "canvas" | "history";

/**
 * The Convex HTTP-action origin (`*.convex.site`), where `/attachments/:id` is
 * served. Convex derives it from the deployment URL (`*.convex.cloud`); a custom
 * or non-standard domain is passed through unchanged.
 */
function convexSiteUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (typeof url !== "string" || url.length === 0) return null;
  return url.replace(/\.convex\.cloud(?=\/|$)/, ".convex.site").replace(/\/+$/, "");
}

function Brand() {
  return (
    <div className="hc-brand">
      <span className="hc-brand__mark" aria-hidden="true">
        H
      </span>
      <span>Hermes Canvas</span>
      <span className="hc-brand__sub">Wave 1</span>
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="hc-viewswitch" role="group" aria-label="Right pane view">
      <button
        type="button"
        className="hc-viewswitch__btn"
        aria-pressed={view === "canvas"}
        onClick={() => onChange("canvas")}
      >
        Canvas
      </button>
      <button
        type="button"
        className="hc-viewswitch__btn"
        aria-pressed={view === "history"}
        onClick={() => onChange("history")}
      >
        History
      </button>
    </div>
  );
}

/** The honest data-provenance strip. Live vs demo copy comes from `bannerFor`. */
function WorkspaceBanner({ copy }: { copy: BannerCopy }) {
  const className =
    copy.tone === "live"
      ? "hc-databanner hc-databanner--live"
      : copy.tone === "loading"
        ? "hc-databanner hc-databanner--loading"
        : "hc-databanner";
  return (
    <div className={className} role="status">
      <span className="hc-databanner__dot" aria-hidden="true" />
      <Text size="sm">
        <strong>{copy.label}</strong> — {copy.detail}
      </Text>
    </div>
  );
}

/**
 * The shared presentational layout. Both the live and demo workspaces build their
 * adapters and pass them here, so the two paths render through one identical tree.
 */
function WorkspaceView({
  banner,
  statusLabel,
  statusTone,
  chat,
  canvasAdapter,
  activeTabId,
  activeArtifactId,
  historyAdapter,
  readership,
}: {
  banner: BannerCopy;
  statusLabel: string;
  statusTone: StatusTone;
  chat: ReactNode;
  canvasAdapter: CanvasDataAdapter;
  activeTabId: string | null;
  activeArtifactId: string | null;
  historyAdapter: HistoryAdapter;
  /** Optional owner readership summary, mounted under history (live mode only). */
  readership?: ReactNode;
}) {
  const [view, setView] = useState<View>("canvas");

  const header = useMemo(
    () => (
      <div className="hc-header">
        <Brand />
        <div className="hc-header__spacer" />
        <ViewSwitch view={view} onChange={setView} />
        <div className="hc-header__spacer" />
        <div className="hc-header__controls">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title={`${statusLabel} session`}
          >
            <StatusDot status={statusTone} label={`${statusLabel} session`} />
            <Text size="sm" tone="tertiary">
              {statusLabel}
            </Text>
          </span>
          <ThemeToggle />
        </div>
      </div>
    ),
    [view, statusLabel, statusTone],
  );

  const rightPane =
    view === "canvas" ? (
      <div className="hc-pane-fill">
        <CanvasShell
          adapter={canvasAdapter}
          activeTabId={activeTabId}
          activeArtifactId={activeArtifactId}
          style={{ height: "100%" }}
        />
      </div>
    ) : (
      <div className="hc-history-region">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--hc-space-4)" }}>
          <HistoryPanel adapter={historyAdapter} />
          {readership}
        </div>
      </div>
    );

  return (
    <AppShell header={header}>
      <div className="hc-workspace">
        <WorkspaceBanner copy={banner} />
        <div className="hc-workspace__body">
          <SplitPane
            className="hc-workspace__split"
            storageKey="hc-chat-canvas-split"
            defaultFraction={0.4}
            min={0.25}
            max={0.6}
            separatorLabel="Resize chat and canvas panes"
            primary={<div className="hc-pane-fill">{chat}</div>}
            secondary={rightPane}
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Local, clearly-labeled demo seed. `connected` picks the honest demo copy. */
function DemoWorkspace({ connected }: { connected: boolean }) {
  const [chatBackend] = useState<ChatBackend>(() =>
    createMockChatBackend({ initialItems: buildDemoChatItems(Date.now()) }),
  );
  const { adapter: canvasAdapter, activeTabId, activeArtifactId } = useDemoCanvasAdapter();
  const history = useMockHistoryAdapter();

  return (
    <WorkspaceView
      banner={bannerFor("demo", connected)}
      statusLabel="Demo"
      statusTone="neutral"
      chat={<MockChatPane backend={chatBackend} />}
      canvasAdapter={canvasAdapter}
      activeTabId={activeTabId}
      activeArtifactId={activeArtifactId}
      historyAdapter={history.adapter}
    />
  );
}

/** Live Convex-backed workspace — mounted only when the deployment has data. */
function LiveWorkspace() {
  const client = useConvex();
  // The attachment-download route is owner-guarded and reads the Convex Auth token
  // from an `Authorization` header (not a cookie), so a plain anchor href 401s. We
  // fetch the bytes with the token instead; keep it in a ref so the once-created
  // backend always reads the freshest token (it can refresh mid-session).
  const token = useAuthToken();
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [chatBackend] = useState<ChatBackend>(() => {
    const siteUrl = convexSiteUrl();
    return createConvexChatBackend(client, {
      attachmentEndpoint: siteUrl
        ? { baseUrl: siteUrl, getToken: () => tokenRef.current }
        : undefined,
    });
  });
  const { adapter: canvasAdapter, activeTabId, activeArtifactId } = useConvexCanvasAdapter();
  const historyAdapter = useConvexHistoryAdapter(activeArtifactId);

  return (
    <WorkspaceView
      banner={bannerFor("live", true)}
      statusLabel="Live"
      statusTone="success"
      chat={
        <ChatProvider backend={chatBackend}>
          <ChatPane />
        </ChatProvider>
      }
      canvasAdapter={canvasAdapter}
      activeTabId={activeTabId}
      activeArtifactId={activeArtifactId}
      historyAdapter={historyAdapter}
      readership={<ReadershipPanel />}
    />
  );
}

/**
 * When a Convex client is mounted, probe live state and route: live if the
 * deployment has artifacts, the labeled demo if it is empty, a connecting banner
 * while the probe resolves. The probe is one cheap live query; the heavy live
 * hooks only mount inside `LiveWorkspace`.
 */
function ConvexWorkspace() {
  const artifacts = useQuery(api.canvas.listArtifacts, {});
  const connectTimedOut = useConnectTimeout(3000);
  const mode = resolveWorkspaceMode({
    hasConvex: true,
    loaded: artifacts !== undefined,
    artifactCount: artifacts?.length ?? 0,
    connectTimedOut,
  });

  if (mode === "live") return <LiveWorkspace />;
  if (mode === "demo") return <DemoWorkspace connected />;

  // Loading: render the demo shell chrome behind an honest "connecting" banner so
  // the layout is stable and never flashes demo content labeled as live.
  return <LoadingWorkspace />;
}

/** A stable frame shown while the live probe resolves. */
function LoadingWorkspace() {
  const { adapter: canvasAdapter, activeTabId, activeArtifactId } = useDemoCanvasAdapter();
  const history = useMockHistoryAdapter();
  const [chatBackend] = useState<ChatBackend>(() => createMockChatBackend({ auto: false }));
  return (
    <WorkspaceView
      banner={bannerFor("loading", true)}
      statusLabel="Connecting"
      statusTone="info"
      chat={<MockChatPane backend={chatBackend} />}
      canvasAdapter={canvasAdapter}
      activeTabId={activeTabId}
      activeArtifactId={activeArtifactId}
      historyAdapter={history.adapter}
    />
  );
}

/** Flip to true once `ms` has elapsed — bounds the initial connecting state. */
function useConnectTimeout(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return elapsed;
}

export function IntegrationApp() {
  const hasConvex = useHasConvex();
  return (
    <FlagsProvider>{hasConvex ? <ConvexWorkspace /> : <DemoWorkspace connected={false} />}</FlagsProvider>
  );
}
