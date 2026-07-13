"use client";

/**
 * ChatPane (OWNER: COURIER) — the assembled chat surface.
 *
 * Composes the transcript (`MessageList`) and the input (`Composer`) into one
 * pane, wired to the backend through `useChat()`. It is deliberately thin: all
 * data flows through the seam, so dropping this into the two-pane app shell (PANES)
 * with a Convex-backed `<ChatProvider>` is the whole integration — no rewrite.
 *
 * Provide your own `<ChatProvider backend={…}>` above this, or use `MockChatPane`
 * for isolated development / demos.
 */

import { Panel } from "@hermes/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { ChatProvider, useChat } from "./ChatProvider";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { createMockChatBackend } from "./mockBackend";
import type { ChatBackend } from "./backend";

export interface ChatPaneProps {
  /** Header title. Defaults to "Hermes". */
  title?: ReactNode;
  /** Header trailing slot (e.g. a status dot, theme toggle). */
  actions?: ReactNode;
}

/** The inner pane; expects a `<ChatProvider>` ancestor. */
export function ChatPane({ title = "Hermes", actions }: ChatPaneProps) {
  const { snapshot, retry } = useChat();
  return (
    <Panel
      title={title}
      actions={actions}
      padding="none"
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
    >
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <MessageList items={snapshot.items} connection={snapshot.connection} onRetry={retry} />
        <Composer />
      </div>
    </Panel>
  );
}

/**
 * Self-contained chat pane backed by the in-memory mock — the entry point for
 * local development, demos, and screenshots with no Convex/Hermes running.
 */
export function MockChatPane({ backend, ...props }: ChatPaneProps & { backend?: ChatBackend }) {
  // Create the mock once — a fresh backend per render would reset the transcript.
  const [source] = useState<ChatBackend>(() => backend ?? createMockChatBackend());
  return (
    <ChatProvider backend={source}>
      <ChatPane {...props} />
    </ChatProvider>
  );
}
