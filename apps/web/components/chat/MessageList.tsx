"use client";

/**
 * MessageList (OWNER: COURIER) — the scrollable chat transcript.
 *
 * Renders the laid-out timeline (day dividers + grouped bubbles + system lines), an
 * honest empty state, and a reconnect banner when the live connection is not healthy.
 *
 * iMessage-style behavior, now anchored by `use-stick-to-bottom`:
 *  - Open pinned to the most recent message (`initial`).
 *  - Follow new content only while the user is at the bottom; a mid-stream scroll-up
 *    "escapes the lock" and the transcript stops yanking (the hook handles this).
 *  - Scroll up near the top loads older history; on prepend we restore the viewport
 *    anchor manually (the hook anchors to the bottom, not to a mid-list message).
 *  - A "New messages" pill appears when content arrives while scrolled up.
 *
 * Accessibility: the transcript is a `role="log"` but does NOT carry `aria-live`
 * (that re-announced every streamed token). A dedicated polite status region
 * announces discrete arrivals; the streaming bubble is marked `aria-busy`.
 */

import { EmptyState, Spinner, Text } from "@hermes/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { ConnectionBanner } from "./ConnectionBanner";
import { layoutTimeline } from "./grouping";
import { MessageBubble } from "./MessageBubble";
import { SystemEventRow } from "./SystemEventRow";
import { formatDayDivider } from "./time";
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
  /** Download a committed attachment; omit to hide the download affordance. */
  onDownloadAttachment?: (id: string, name: string) => void;
}

/** Distance (px) from the top that triggers load-older. */
const LOAD_OLDER_THRESHOLD = 72;

/** Top margin per row type, giving groups tight intra-spacing and clear breaks. */
function rowGap(kind: "day-divider" | "group-start" | "grouped" | "system", first: boolean): string {
  if (first) return "0";
  switch (kind) {
    case "day-divider":
      return "var(--hc-space-4)";
    case "group-start":
      return "var(--hc-space-3)";
    case "grouped":
      return "var(--hc-space-1)";
    case "system":
      return "var(--hc-space-2)";
  }
}

function DayDivider({ at }: { at: number }) {
  return (
    <div
      role="separator"
      style={{ display: "flex", alignItems: "center", gap: "var(--hc-space-3)", width: "100%" }}
    >
      <span style={{ flex: 1, height: "var(--hc-border-width)", background: "var(--hc-border)" }} />
      <Text size="xs" weight="medium" tone="tertiary">
        {formatDayDivider(at)}
      </Text>
      <span style={{ flex: 1, height: "var(--hc-border-width)", background: "var(--hc-border)" }} />
    </div>
  );
}

export function MessageList({
  items,
  connection,
  onRetry,
  hasMoreOlder = false,
  loadingOlder = false,
  onLoadOlder,
  onDownloadAttachment,
}: MessageListProps) {
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    initial: "instant",
    resize: "smooth",
  });

  const rows = useMemo(() => layoutTimeline(items), [items]);

  // Stabilize onRetry so memoized bubbles don't re-render on every snapshot: the
  // `useChat` hook hands a fresh retry closure each snapshot; a ref keeps identity.
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;
  const stableRetry = useCallback((id: string) => onRetryRef.current?.(id), []);

  // Same stable-ref treatment for the download handler, so a fresh closure each
  // snapshot doesn't defeat the bubble memo. Kept undefined when downloads are
  // unavailable so the bubble hides the affordance entirely.
  const onDownloadRef = useRef(onDownloadAttachment);
  onDownloadRef.current = onDownloadAttachment;
  // Key on availability (a stable boolean), not the closure identity — the handler
  // from `useChat` is a fresh closure each snapshot, so only the presence/absence
  // of downloads should change `stableDownload`'s identity.
  const canDownload = Boolean(onDownloadAttachment);
  const stableDownload = useMemo(
    () => (canDownload ? (id: string, name: string) => onDownloadRef.current?.(id, name) : undefined),
    [canDownload],
  );

  // --- Load older + prepend anchor restoration -----------------------------
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;
  /** When set, restore scrollTop after a prepend so the anchor message stays put. */
  const pendingRestoreHeight = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (
      el.scrollTop <= LOAD_OLDER_THRESHOLD &&
      hasMoreOlder &&
      !loadingOlderRef.current &&
      onLoadOlder
    ) {
      pendingRestoreHeight.current = el.scrollHeight;
      onLoadOlder();
    }
  }, [hasMoreOlder, onLoadOlder, scrollRef]);

  // A prepend grows the list at the top; the user is scrolled up (not sticking),
  // so add the height delta to keep the same message under the viewport.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || pendingRestoreHeight.current == null) return;
    const prev = pendingRestoreHeight.current;
    pendingRestoreHeight.current = null;
    const delta = el.scrollHeight - prev;
    if (delta > 0) el.scrollTop = el.scrollTop + delta;
  }, [rows, scrollRef]);

  // --- "New messages" pill --------------------------------------------------
  const [showPill, setShowPill] = useState(false);
  const prevCount = useRef(items.length);
  useEffect(() => {
    if (items.length > prevCount.current && !isAtBottom) setShowPill(true);
    prevCount.current = items.length;
  }, [items.length, isAtBottom]);
  useEffect(() => {
    if (isAtBottom) setShowPill(false);
  }, [isAtBottom]);

  // --- Polite arrival announcements (not per-token) -------------------------
  const [announcement, setAnnouncement] = useState("");
  const lastAgentDone = useRef<string | null>(null);
  useEffect(() => {
    let latestDone: string | null = null;
    for (const item of items) {
      if (item.kind === "message" && item.message.role === "agent" && item.message.status === "complete") {
        latestDone = item.message.id;
      }
    }
    if (latestDone && latestDone !== lastAgentDone.current) {
      if (lastAgentDone.current !== null) setAnnouncement("Hermes replied");
      lastAgentDone.current = latestDone;
    }
  }, [items]);

  let firstRendered = true;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <ConnectionBanner connection={connection} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-label="Conversation"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "var(--hc-space-4)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div ref={contentRef} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {(hasMoreOlder || loadingOlder) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "var(--hc-space-2)",
                  padding: "var(--hc-space-2)",
                  color: "var(--hc-text-tertiary)",
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
              rows.map((row) => {
                if (row.kind === "day-divider") {
                  const mt = rowGap("day-divider", firstRendered);
                  firstRendered = false;
                  return (
                    <div key={row.id} style={{ marginTop: mt }}>
                      <DayDivider at={row.at} />
                    </div>
                  );
                }
                if (row.kind === "system") {
                  const mt = rowGap("system", firstRendered);
                  firstRendered = false;
                  return (
                    <div key={row.event.id} style={{ marginTop: mt }}>
                      <SystemEventRow event={row.event} />
                    </div>
                  );
                }
                const mt = rowGap(row.grouped ? "grouped" : "group-start", firstRendered);
                firstRendered = false;
                return (
                  <div key={row.message.id} style={{ marginTop: mt }}>
                    <MessageBubble
                      message={row.message}
                      onRetry={stableRetry}
                      onDownloadAttachment={stableDownload}
                      grouped={row.grouped}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showPill && (
          <button
            type="button"
            onClick={() => {
              setShowPill(false);
              void scrollToBottom();
            }}
            style={{
              position: "absolute",
              bottom: "var(--hc-space-3)",
              left: "50%",
              transform: "translateX(-50%)",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--hc-space-1)",
              padding: "var(--hc-space-1) var(--hc-space-3)",
              borderRadius: "var(--hc-radius-full)",
              border: "var(--hc-border-width) solid var(--hc-border)",
              background: "var(--hc-surface)",
              color: "var(--hc-text)",
              fontSize: "var(--hc-font-size-sm)",
              boxShadow: "var(--hc-shadow-md)",
              cursor: "pointer",
              zIndex: "var(--hc-z-raised, 1)",
            }}
          >
            New messages ↓
          </button>
        )}

        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {announcement}
        </div>
      </div>
    </div>
  );
}
