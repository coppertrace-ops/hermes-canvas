"use client";

/**
 * SystemEventRow (OWNER: COURIER) — an inline system line in the chat feed.
 *
 * Renders a ledger event as a quiet, centered narration ("Hermes updated artifact
 * art_3 → v12"). These are legibility, not conversation, so they sit visually below
 * the message bubbles. A `limit_rejected` event is the one that must NOT be quiet:
 * a blocked write is evidence (plan §3), so it renders in the danger tone with a
 * marker rather than a muted grey line.
 */

import { Text } from "@hermes/ui";
import type { StatusTone } from "@hermes/ui";
import type { CSSProperties } from "react";
import type { SystemEvent } from "./types";

/** Visual weight for a system line. Only rejections escalate; the rest stay quiet. */
function toneFor(event: SystemEvent): StatusTone {
  if (event.kind === "limit_rejected") return "danger";
  if (event.kind === "auth") return "info";
  return "neutral";
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--hc-space-2)",
  padding: "var(--hc-space-1) var(--hc-space-2)",
  width: "100%",
};

export interface SystemEventRowProps {
  event: SystemEvent;
}

export function SystemEventRow({ event }: SystemEventRowProps) {
  const tone = toneFor(event);
  const isAlert = tone === "danger";
  return (
    <div style={row} data-kind={event.kind} role="note" aria-label={event.summary}>
      {isAlert && (
        <span
          aria-hidden
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "var(--hc-radius-full)",
            background: "var(--hc-danger)",
            flexShrink: 0,
          }}
        />
      )}
      <Text size="xs" tone={isAlert ? "danger" : "tertiary"} align="center">
        {event.summary}
      </Text>
    </div>
  );
}
