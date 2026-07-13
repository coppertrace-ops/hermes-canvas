"use client";

/**
 * Integration shell (OWNER: PROOF).
 *
 * Composes the merged Wave 1 product from the owned subsystems' public APIs:
 * the COURIER chat pane, the PANES canvas shell, and the CHRONICLE history panel,
 * laid out in the GLASS `AppShell` with a resizable `SplitPane`, dark/light theme
 * toggle, and a Canvas/History view switch. Nothing here reimplements those
 * surfaces — it wires them together and feeds them the demo seed (behind an
 * honest banner) until live Hermes state exists.
 */

import { useMemo, useState } from "react";
import { AppShell, StatusDot, Text, ThemeToggle } from "@hermes/ui";
import { SplitPane } from "@hermes/render";
import { CanvasShell } from "../canvas";
import { MockChatPane, createMockChatBackend } from "../chat";
import type { ChatBackend } from "../chat";
import { HistoryPanel, useMockHistoryAdapter } from "../history";
import { useDemoCanvasAdapter } from "./useDemoCanvasAdapter";
import { buildDemoChatItems } from "./demoSeed";

type View = "canvas" | "history";

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

function DemoBanner() {
  return (
    <div className="hc-databanner" role="status">
      <span className="hc-databanner__dot" aria-hidden="true" />
      <Text size="sm">
        <strong>Demo data</strong> — illustrative content for the Wave 1 integration
        preview, not live Hermes state. Chat replies, versions, and diffs are seeded
        locally.
      </Text>
    </div>
  );
}

export function IntegrationApp() {
  const [view, setView] = useState<View>("canvas");

  // Chat: a lifelike mock backend seeded with an opening transcript. Auto mode
  // acks sends and streams an agent reply, so the pane feels live in the demo.
  const [chatBackend] = useState<ChatBackend>(() =>
    createMockChatBackend({ initialItems: buildDemoChatItems(Date.now()) }),
  );

  // Canvas + history are driven through their real adapter seams by local mocks.
  const { adapter: canvasAdapter, activeTabId, activeArtifactId } = useDemoCanvasAdapter();
  const history = useMockHistoryAdapter();

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
            title="Demo session"
          >
            <StatusDot status="success" label="Demo session" />
            <Text size="sm" tone="tertiary">
              Demo
            </Text>
          </span>
          <ThemeToggle />
        </div>
      </div>
    ),
    [view],
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
        <HistoryPanel adapter={history.adapter} />
      </div>
    );

  return (
    <AppShell header={header}>
      <div className="hc-workspace">
        <DemoBanner />
        <div className="hc-workspace__body">
          <SplitPane
            className="hc-workspace__split"
            storageKey="hc-chat-canvas-split"
            defaultFraction={0.4}
            min={0.25}
            max={0.6}
            separatorLabel="Resize chat and canvas panes"
            primary={
              <div className="hc-pane-fill">
                <MockChatPane backend={chatBackend} />
              </div>
            }
            secondary={rightPane}
          />
        </div>
      </div>
    </AppShell>
  );
}
