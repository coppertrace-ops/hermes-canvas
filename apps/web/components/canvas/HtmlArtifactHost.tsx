"use client";

/**
 * Sandboxed HTML artifact host tile (OWNER: PANES; WP5, plan §4/§5 P5).
 *
 * Mounts WARDEN's content-origin shell in an iframe whose sandbox attribute is
 * `@hermes/policy`'s `FRAME_SANDBOX_ATTR` verbatim — `allow-scripts` and nothing
 * else, so the frame runs at an opaque origin with no escape or egress path
 * (the content CSP closes the rest; see `docs/threat-model.md`). All protocol
 * decisions live in the DOM-free `createFrameHost` controller; this component
 * only wires it to the real iframe, the window `message` stream, and a
 * ready-deadline timer.
 *
 * Honest states, never a silent blank (plan §4):
 *   - connecting: labeled placeholder while the shell loads.
 *   - unavailable: the shell never said ready — reason + raw source.
 *   - render_error: the artifact threw in the sandbox — message + raw source.
 *
 * Performance rule (plan §4): callers mount this ONLY for the focused artifact
 * (`ArtifactPane` renders just the focused one; history previews mount behind an
 * explicit activate click — see `HtmlPreviewActivate`).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FRAME_SANDBOX_ATTR } from "@hermes/policy";
import { cssVar, Text } from "@hermes/ui";
import {
  createFrameHost,
  resolveContentOrigin,
  FRAME_MIN_HEIGHT_PX,
  type FrameHostController,
  type FrameHostState,
} from "./htmlFrameHost";

/** How long the shell gets to announce `ready` before we call it unavailable. */
const READY_TIMEOUT_MS = 10_000;

export interface HtmlArtifactHostProps {
  html: string;
  artifactId: string;
  seq: number;
  /** Content origin override (tests); defaults to `NEXT_PUBLIC_CONTENT_ORIGIN`. */
  contentOrigin?: string;
  /** Accessible frame title; defaults to a generic label. */
  title?: string;
  className?: string;
}

const sourceBox: CSSProperties = {
  margin: 0,
  padding: cssVar("space-3"),
  border: `1px solid ${cssVar("border-strong")}`,
  borderRadius: cssVar("radius-md"),
  background: cssVar("surface-sunken"),
  overflow: "auto",
  maxHeight: "24rem",
  fontSize: "0.8125rem",
  lineHeight: 1.5,
};

function RawSource({ html }: { html: string }) {
  return (
    <pre style={sourceBox}>
      <code>{html}</code>
    </pre>
  );
}

export function HtmlArtifactHost({
  html,
  artifactId,
  seq,
  contentOrigin,
  title,
  className,
}: HtmlArtifactHostProps) {
  const origin = useMemo(
    () => resolveContentOrigin(contentOrigin ?? process.env.NEXT_PUBLIC_CONTENT_ORIGIN),
    [contentOrigin],
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const controllerRef = useRef<FrameHostController | null>(null);
  const [state, setState] = useState<FrameHostState>({ phase: "connecting" });

  // One controller per mounted frame. The iframe element exists after the first
  // render (the frame is always in the tree), so effect order is safe.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const controller = createFrameHost(iframe, { html, artifactId, seq }, setState);
    controllerRef.current = controller;
    const onMessage = (event: MessageEvent) => void controller.handleMessage(event);
    window.addEventListener("message", onMessage);
    const deadline = window.setTimeout(() => controller.timeout(), READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(deadline);
      controllerRef.current = null;
    };
    // Keyed on origin only (mount/origin change): content changes flow through
    // setContent below, not a listener remount.
  }, [origin]);

  useEffect(() => {
    controllerRef.current?.setContent({ html, artifactId, seq });
  }, [html, artifactId, seq]);

  const failed = state.phase === "render_error" || state.phase === "unavailable";
  const frameHeight =
    state.phase === "active" && state.height !== null ? state.height : FRAME_MIN_HEIGHT_PX * 3;

  return (
    <div className={className} data-testid="html-artifact-host" data-phase={state.phase}>
      {state.phase === "connecting" && (
        <Text size="sm" tone="tertiary">
          Loading sandboxed preview…
        </Text>
      )}
      {failed && (
        <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-2") }}>
          <Text size="sm" tone="danger" role="alert">
            {state.phase === "render_error"
              ? `This artifact failed to render in the sandbox: ${state.message}`
              : state.reason}
          </Text>
          <RawSource html={html} />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`${origin}/`}
        sandbox={FRAME_SANDBOX_ATTR}
        referrerPolicy="no-referrer"
        title={title ?? "Sandboxed HTML artifact"}
        style={{
          display: failed ? "none" : "block",
          width: "100%",
          height: `${frameHeight}px`,
          border: 0,
          borderRadius: cssVar("radius-md"),
          background: "transparent",
          colorScheme: "auto",
        }}
      />
    </div>
  );
}
