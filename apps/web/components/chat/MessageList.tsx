"use client";

/**
 * MessageList (OWNER: COURIER) — the scrollable chat transcript.
 *
 * Renders the merged timeline (bubbles + system lines), an honest empty state, and
 * a reconnect banner when the live connection is not healthy. Auto-scrolls to the
 * newest item only when the user is already near the bottom, so reading history is
 * never yanked away by an incoming message.
 */

import { EmptyState } from "@hermes/ui";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ConnectionBanner } from "./ConnectionBanner";
import { MessageBubble } from "./MessageBubble";
import { SystemEventRow } from "./SystemEventRow";
import type { ChatItem, ConnectionState } from "./types";

export interface MessageListProps {
  items: ChatItem[];
  connection: ConnectionState;
  onRetry?: (messageId: string) => void;
}

/** Distance (px) from the bottom within which we consider the user "pinned". */
const PIN_THRESHOLD = 96;

export function MessageList({ items, connection, onRetry }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Track whether the user is pinned to the bottom before the list changes.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance <= PIN_THRESHOLD;
  };

  // After items change, stick to the bottom only if the user was already there.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

  // On first mount, start at the bottom (most recent).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <ConnectionBanner connection={connection} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "var(--hc-space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--hc-space-3)",
        }}
      >
        {items.length === 0 ? (
          <div style={{ margin: "auto", width: "100%" }}>
            <EmptyState
              title="No messages yet"
              description="Send a message to start working with Hermes. Its replies and canvas actions appear here."
            />
          </div>
        ) : (
          items.map((item) =>
            item.kind === "message" ? (
              <MessageBubble key={item.message.id} message={item.message} onRetry={onRetry} />
            ) : (
              <SystemEventRow key={item.event.id} event={item.event} />
            ),
          )
        )}
      </div>
    </div>
  );
}
