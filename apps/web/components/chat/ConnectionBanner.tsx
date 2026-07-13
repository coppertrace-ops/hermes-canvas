"use client";

/**
 * ConnectionBanner (OWNER: COURIER) — honest live-connection state.
 *
 * The Phase-2 gate (G2) requires that a mid-stream network kill reconnects to a
 * consistent state; the UI must SAY it is reconnecting rather than freeze and
 * pretend. `live` renders nothing (no chrome for the healthy path); the other
 * states render a thin, unmissable strip.
 */

import { Spinner, Text } from "@hermes/ui";
import type { CSSProperties } from "react";
import type { ConnectionState } from "./types";

const strip: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--hc-space-2)",
  padding: "var(--hc-space-1) var(--hc-space-3)",
  borderBottom: "var(--hc-border-width) solid var(--hc-border)",
};

export function ConnectionBanner({ connection }: { connection: ConnectionState }) {
  if (connection === "live") return null;

  const offline = connection === "offline";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...strip,
        background: offline ? "var(--hc-danger-subtle)" : "var(--hc-warning-subtle)",
      }}
    >
      {!offline && <Spinner label="" />}
      <Text size="xs" tone={offline ? "danger" : "secondary"}>
        {connection === "connecting"
          ? "Connecting…"
          : connection === "reconnecting"
            ? "Reconnecting — messages will resync"
            : "Offline — reconnecting when the network returns"}
      </Text>
    </div>
  );
}
