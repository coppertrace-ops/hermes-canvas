/**
 * HTML artifact frame-host controller (OWNER: PANES; WP5, plan §4/§5 P5).
 *
 * The DOM-free brain of `HtmlArtifactHost`: it owns the parent side of the
 * WARDEN frame protocol (`@hermes/policy` — imported verbatim, never re-derived)
 * and is exhaustively unit-testable in plain Node with synthesized hostile
 * events, matching the policy package's own G5 test posture. The React
 * component is a thin wiring layer: real iframe, real `window` listener, real
 * timer — every decision lives here.
 *
 * Protocol recap (parent side):
 *   1. Wait for the shell's `ready`, verified by SOURCE IDENTITY
 *      (`readShellMessage` → `event.source === iframe.contentWindow`; an
 *      opaque-origin frame reports `origin === "null"`, so the origin string is
 *      useless for identity).
 *   2. Post `{type:'render', html, artifactId, seq}` DOWN. The sandboxed frame
 *      runs at an OPAQUE origin, so a specific `targetOrigin` can never match —
 *      `"*"` is the only deliverable value and is safe here: the message is
 *      addressed to the one window we created and identity-checked; no other
 *      window can receive it.
 *   3. Accept ONLY whitelisted control messages back (`ready`/`height`/
 *      `render_error`). A message from our frame that fails the whitelist is an
 *      attack tripwire — counted in `rejectedCount`, never processed. Messages
 *      from other windows are ignored silently (unrelated postMessage traffic).
 *
 * Failure visibility (plan §4): a shell that never says `ready` becomes an
 * explicit `unavailable` state, and a `render_error` carries its message — the
 * host never shows a silent blank.
 */

import { readShellMessage, renderMessageSchema } from "@hermes/policy";
import type { MessageEventLike, RenderMessage } from "@hermes/policy";

/** Default content origin — MUST match `appCspHostsFromEnv` (`apps/web/appCsp.mjs`)
 * so the frame we mount is exactly the origin the app CSP `frame-src` authorizes.
 * A drift guard in `htmlFrameHost.test.ts` asserts the two stay equal. */
export const DEFAULT_CONTENT_ORIGIN = "https://hermes-canvas-content.vercel.app";

/** Resolve the content origin from an env value (trailing slashes stripped). */
export function resolveContentOrigin(raw: string | undefined): string {
  const v = (raw ?? "").trim().replace(/\/+$/, "");
  return v.length > 0 ? v : DEFAULT_CONTENT_ORIGIN;
}

/** Height bounds applied to shell height reports (hostile or buggy values). */
export const FRAME_MIN_HEIGHT_PX = 48;
export const FRAME_MAX_HEIGHT_PX = 8000;

export function clampFrameHeight(height: number): number {
  if (!Number.isFinite(height)) return FRAME_MIN_HEIGHT_PX;
  return Math.min(FRAME_MAX_HEIGHT_PX, Math.max(FRAME_MIN_HEIGHT_PX, Math.round(height)));
}

/** The content of the artifact version currently being hosted. */
export interface FrameHostContent {
  html: string;
  artifactId: string;
  seq: number;
}

/** Host lifecycle state, rendered honestly by the component. */
export type FrameHostState =
  | { phase: "connecting" }
  | { phase: "active"; height: number | null }
  | { phase: "render_error"; message: string }
  | { phase: "unavailable"; reason: string };

/** Structural slice of the iframe the controller posts through (DOM-free). */
export interface HostFrameLike {
  contentWindow: { postMessage(message: unknown, targetOrigin: string): void } | null;
}

/** Classification of one incoming message, for tests and tripwire counting. */
export type MessageDisposition = "handled" | "rejected" | "not_ours";

export interface FrameHostController {
  /** Feed every window `message` event through this. Never throws. */
  handleMessage(event: MessageEventLike): MessageDisposition;
  /** Swap the hosted content (new version); re-posts if the shell is ready. */
  setContent(content: FrameHostContent): void;
  /** Wiring layer calls this when the ready deadline elapses un-cleared. */
  timeout(): void;
  readonly state: FrameHostState;
  /** Whitelist-failing messages from OUR frame (attack tripwire, plan §4). */
  readonly rejectedCount: number;
}

export function createFrameHost(
  iframe: HostFrameLike,
  initialContent: FrameHostContent,
  onStateChange: (state: FrameHostState) => void,
): FrameHostController {
  let content = initialContent;
  let state: FrameHostState = { phase: "connecting" };
  let readySeen = false;
  let rejectedCount = 0;

  function setState(next: FrameHostState): void {
    state = next;
    onStateChange(next);
  }

  function postRender(): void {
    const target = iframe.contentWindow;
    if (!target) return;
    const msg: RenderMessage = renderMessageSchema.parse({
      type: "render",
      html: content.html,
      artifactId: content.artifactId,
      seq: content.seq,
    });
    // Opaque-origin recipient: "*" is the only deliverable targetOrigin (see
    // module docs). Identity was established by `readShellMessage` on `ready`.
    target.postMessage(msg, "*");
  }

  return {
    handleMessage(event) {
      const msg = readShellMessage(event, iframe);
      if (!msg) {
        // From our frame but not a whitelisted, well-formed control message ⇒
        // tripwire. From anywhere else ⇒ unrelated traffic, ignored silently.
        const fromOurFrame =
          event.source !== null &&
          event.source !== undefined &&
          iframe.contentWindow !== null &&
          event.source === iframe.contentWindow;
        if (fromOurFrame) {
          rejectedCount += 1;
          return "rejected";
        }
        return "not_ours";
      }
      switch (msg.type) {
        case "ready":
          // First ready, or a shell reload — (re)send the current content. A
          // late ready after `unavailable` recovers honestly to connecting→active.
          readySeen = true;
          postRender();
          setState({ phase: "active", height: null });
          return "handled";
        case "height":
          if (state.phase === "active") {
            setState({ phase: "active", height: clampFrameHeight(msg.height) });
          }
          return "handled";
        case "render_error":
          setState({ phase: "render_error", message: msg.message });
          return "handled";
      }
    },
    setContent(next) {
      const changed =
        next.html !== content.html ||
        next.seq !== content.seq ||
        next.artifactId !== content.artifactId;
      content = next;
      if (!changed || !readySeen) return;
      // New version while live: re-render. A previous render_error may be fixed
      // by the new content, so return to active and let the shell report back.
      postRender();
      setState({ phase: "active", height: state.phase === "active" ? state.height : null });
    },
    timeout() {
      if (state.phase === "connecting") {
        setState({
          phase: "unavailable",
          reason: "The sandbox frame did not become ready. The artifact's raw source is shown instead.",
        });
      }
    },
    get state() {
      return state;
    },
    get rejectedCount() {
      return rejectedCount;
    },
  };
}
