"use client";

/**
 * MessageBubble (OWNER: COURIER) — one chat message.
 *
 * Human messages align right on the accent surface; agent messages align left on a
 * neutral surface. Agent bodies render sanitized markdown; human stay plain unless
 * they contain markdown. Streaming replies show typing dots after partial text.
 */

import { Button, Text } from "@hermes/ui";
import type { CSSProperties } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { MarkdownBody } from "./MarkdownBody";
import { StreamingDots } from "./StreamingDots";
import type { ChatMessage } from "./types";

export interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
}

function bubbleStyle(isHuman: boolean, isError: boolean): CSSProperties {
  return {
    maxWidth: "min(42rem, 82%)",
    padding: "var(--hc-space-2) var(--hc-space-3)",
    borderRadius: "var(--hc-radius-lg)",
    background: isHuman ? "var(--hc-accent-subtle)" : "var(--hc-surface)",
    border: `var(--hc-border-width) solid ${isError ? "var(--hc-danger)" : "var(--hc-border)"}`,
    display: "flex",
    flexDirection: "column",
    gap: "var(--hc-space-2)",
  };
}

function looksLikeMarkdown(body: string): boolean {
  return /```|^\s{0,3}#{1,6}\s|^\s*[-*+]\s|\*\*[^*]+\*\*|`[^`]+`|\[.+\]\(.+\)/m.test(body);
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isHuman = message.role === "human";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";
  const isSending = message.status === "sending";
  const useMd = !isHuman || looksLikeMarkdown(message.body);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isHuman ? "flex-end" : "flex-start",
        width: "100%",
      }}
      data-role={message.role}
      data-status={message.status}
    >
      <div style={bubbleStyle(isHuman, isError)}>
        <Text size="xs" weight="medium" tone={isHuman ? "accent" : "secondary"} aria-hidden>
          {isHuman ? "You" : "Hermes"}
        </Text>

        {message.body.length > 0 && (
          <div style={{ position: "relative" }}>
            {useMd ? (
              <MarkdownBody>{message.body}</MarkdownBody>
            ) : (
              <Text as="div" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {message.body}
              </Text>
            )}
            {isStreaming && (
              <span style={{ display: "inline-block", marginLeft: "var(--hc-space-1)" }}>
                <StreamingDots />
              </span>
            )}
          </div>
        )}
        {message.body.length === 0 && isStreaming && <StreamingDots />}

        {message.attachments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--hc-space-1)" }}>
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} readOnly />
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
