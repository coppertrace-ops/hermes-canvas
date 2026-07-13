"use client";

/**
 * MessageList (OWNER: COURIER) — the scrollable chat transcript.
 *
 * Renders the merged timeline (bubbles + system lines), an honest empty state, and
 * a reconnect banner when the live connection is not healthy.
 *
 * iMessage-style behavior:
 *  - Open pinned to the *most recent* message (bottom).
 *  - Auto-scroll to newest only when the user is already near the bottom.
 *  - Scroll up near the top to load older history (optional `onLoadOlder`).
 *  - When older messages prepend, preserve the viewport anchor so the list does
 *    not jump.
 */

import { EmptyState, Spinner } from "@hermes/ui";
import { useLayoutEffect, useRef } from "react";
import { ConnectionBanner } from "./ConnectionBanner";
import { MessageBubble } from "./MessageBubble";
import { SystemEventRow } from "./SystemEventRow";
import type { ChatItem, ConnectionState } from "./types";

export interface MessageListProps {
  items: ChatItem[];
  connection: ConnectionState;
  onRetry?: (messageId: string) => void;
  /** Older history may exist above the current window. */
  hasMoreOlder?: boolean;
  /** True while a scroll-up page load is in flight. */
  loadingOlder?: boolean;
  /** Request the next older page (scroll-up). */
  onLoadOlder?: () => void;
}

/** Distance (px) from the bottom within which we consider the user "pinned". */
const PIN_THRESHOLD = 96;
/** Distance (px) from the top that triggers load-older. */
const LOAD_OLDER_THRESHOLD = 72;

export function MessageList({
  items,
  connection,
  onRetry,
  hasMoreOlder = false,
  loadingOlder = false,
  onLoadOlder,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const didInitialScroll = useRef(false);
  /** When set, restore scrollTop after a prepend so the anchor message stays put. */
  const pendingRestoreHeight = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  loadingOlderRef.current = loadingOlder;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance <= PIN_THRESHOLD;

    if (
      el.scrollTop <= LOAD_OLDER_THRESHOLD &&
      hasMoreOlder &&
      !loadingOlderRef.current &&
      onLoadOlder
    ) {
      pendingRestoreHeight.current = el.scrollHeight;
      onLoadOlder();
    }
  };

  // After items change: (1) first paint → bottom, (2) pinned → stick, (3) prepend → restore.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (pendingRestoreHeight.current != null) {
      const prev = pendingRestoreHeight.current;
      pendingRestoreHeight.current = null;
      const delta = el.scrollHeight - prev;
      if (delta > 0) {
        el.scrollTop = el.scrollTop + delta;
        return;
      }
    }

    if (items.length === 0) return;

    if (!didInitialScroll.current) {
      el.scrollTop = el.scrollHeight;
      pinnedRef.current = true;
      didInitialScroll.current = true;
      return;
    }

    if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

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
        {(hasMoreOlder || loadingOlder) && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "var(--hc-space-2)",
              padding: "var(--hc-space-2)",
              color: "var(--hc-color-text-muted)",
              fontSize: "var(--hc-font-size-sm)",
            }}
          >
            {loadingOlder ? (
              <>
                <Spinner />
                <span>Loading earlier messages…</span>
              </>
            ) : (
              <span>Scroll up for earlier messages</span>
            )}
          </div>
        )}
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
