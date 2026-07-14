"use client";

/**
 * MessageBubble (OWNER: COURIER) — one chat message.
 *
 * Human messages align right on the accent surface; agent messages align left on a
 * neutral surface. The two are distinguished by fill + alignment, not by a border —
 * borders are reserved for the error state (a blocked send is evidence). Agent
 * bodies render sanitized markdown; human bodies render as plain text with their
 * line breaks preserved (never re-interpreted as markdown). Streaming replies show
 * typing dots after partial text.
 *
 * Grouping: consecutive messages from one author collapse into a group (see
 * `layoutTimeline`). Only the first bubble of a group carries the author label +
 * time; `grouped` continuations render header-less and tighter. The component is
 * memoized on message identity/body so a streamed delta re-renders only the
 * streaming bubble, not the whole transcript.
 */

import { Button, Text } from "@hermes/ui";
import { memo, useState } from "react";
import type { CSSProperties } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { CopyButton } from "./CopyButton";
import { MarkdownBody } from "./MarkdownBody";
import { StreamingDots } from "./StreamingDots";
import { formatExactTime, formatMessageTime } from "./time";
import type { AttachmentView, ChatMessage } from "./types";

export interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  /** Download a committed attachment; omit to hide the download affordance. */
  onDownloadAttachment?: (id: string, name: string) => void;
  /** True when this bubble continues the previous author's group (hide header). */
  grouped?: boolean;
}

function bubbleStyle(isHuman: boolean, isError: boolean): CSSProperties {
  return {
    position: "relative",
    maxWidth: "min(42rem, 82%)",
    padding: "var(--hc-space-2) var(--hc-space-3)",
    borderRadius: "var(--hc-radius-lg)",
    background: isHuman ? "var(--hc-accent-subtle)" : "var(--hc-surface-2)",
    // Only the error state carries a border; normal bubbles are fill + radius.
    border: isError ? "var(--hc-border-width) solid var(--hc-danger)" : "none",
    display: "flex",
    flexDirection: "column",
    gap: "var(--hc-space-2)",
  };
}

function MessageBubbleImpl({
  message,
  onRetry,
  onDownloadAttachment,
  grouped = false,
}: MessageBubbleProps) {
  const isHuman = message.role === "human";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";
  const isSending = message.status === "sending";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isHuman ? "flex-end" : "flex-start",
        width: "100%",
      }}
      data-role={message.role}
      data-status={message.status}
      data-grouped={grouped || undefined}
    >
      <div
        style={bubbleStyle(isHuman, isError)}
        aria-busy={isStreaming || undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!grouped && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--hc-space-2)",
              justifyContent: isHuman ? "flex-end" : "flex-start",
            }}
          >
            <Text size="xs" weight="medium" tone={isHuman ? "accent" : "secondary"} aria-hidden>
              {isHuman ? "You" : "Hermes"}
            </Text>
            <Text as="span" size="xs" tone="tertiary" title={formatExactTime(message.at)}>
              {formatMessageTime(message.at)}
            </Text>
          </div>
        )}

        {message.body.length > 0 && (
          <div style={{ position: "relative" }}>
            {isHuman ? (
              <Text
                as="div"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {message.body}
              </Text>
            ) : (
              <MarkdownBody>{message.body}</MarkdownBody>
            )}
            {isStreaming && (
              <span style={{ display: "inline-block", marginLeft: "var(--hc-space-1)" }}>
                <StreamingDots />
              </span>
            )}
          </div>
        )}
        {message.body.length === 0 && isStreaming && <StreamingDots />}

        {/* Copy affordance for completed agent replies. */}
        {!isHuman && !isStreaming && message.body.length > 0 && (
          <CopyButton
            text={message.body}
            visible={hovered}
            label="Copy"
            style={{ position: "absolute", top: "var(--hc-space-1)", right: "var(--hc-space-1)" }}
          />
        )}

        {message.attachments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--hc-space-1)" }}>
            {message.attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                readOnly
                onDownload={
                  onDownloadAttachment
                    ? (id) => onDownloadAttachment(id, attachment.name)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {isSending && (
          <Text size="xs" tone="tertiary">
            Sending…
          </Text>
        )}

        {isError && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--hc-space-2)" }}>
            <Text size="xs" tone="danger">
              {message.error || "Failed to send"}
            </Text>
            {onRetry && (
              <Button size="sm" variant="ghost" onClick={() => onRetry(message.id)}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compare attachments by value, not identity. The snapshot flow rebuilds the
 * `attachments` array on every emit, so an identity check would re-render every
 * bubble on each streamed token — exactly what the memo is meant to prevent.
 */
function sameAttachments(a: AttachmentView[], b: AttachmentView[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.status !== y.status ||
      x.progress !== y.progress ||
      x.name !== y.name ||
      x.error !== y.error ||
      x.previewUrl !== y.previewUrl
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Re-render only when this message's identity, rendered content, grouping, or retry
 * handler changes — so a streamed delta touches just the streaming bubble.
 * `onRetry` must be a stable reference from the caller (see MessageList) for this
 * to hold across snapshots.
 */
export const MessageBubble = memo(MessageBubbleImpl, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.body === next.message.body &&
    prev.message.status === next.message.status &&
    prev.message.error === next.message.error &&
    prev.message.at === next.message.at &&
    prev.grouped === next.grouped &&
    prev.onRetry === next.onRetry &&
    prev.onDownloadAttachment === next.onDownloadAttachment &&
    sameAttachments(prev.message.attachments, next.message.attachments)
  );
});
