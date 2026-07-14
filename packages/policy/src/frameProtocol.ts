/**
 * Sandbox frame postMessage protocol (OWNER: WARDEN, spec §2.2–§2.3).
 *
 * The SafeContentFrame contract, with the origin-verification bug-class fix baked
 * in. ONE source imported verbatim by both ends (PANES `HtmlArtifactHost`, WARDEN
 * `apps/content` shell) so parent and shell can never disagree on the wire format
 * or the identity checks.
 *
 * Message flow (one-way content, control-only replies):
 *   parent → shell:  { type:'render', html, artifactId, seq }   (content goes DOWN)
 *   shell  → parent: ready | height | render_error              (control comes UP)
 *
 * Identity checks (the two bug-class fixes):
 *   - Parent side: an opaque-origin (sandboxed) frame reports `event.origin ===
 *     "null"`, so the parent CANNOT trust the origin string. It verifies SOURCE
 *     IDENTITY instead — `event.source === iframe.contentWindow`. `isFromShell`.
 *   - Shell side: the shell verifies `event.origin` EQUALS the app origin exactly
 *     (a build-time-injected constant) before rendering. `isFromAppOrigin`.
 * A message failing its side's identity check, or failing shape validation, is
 * IGNORED (and counted as `frame_message_rejected` — an attack tripwire). Neither
 * end throws on a bad message.
 *
 * DOM-free by design (structural types, not `lib.dom`), so every verifier and
 * schema is exhaustively unit-testable in plain Node with synthesized hostile
 * events (G5 requirement).
 */

import { z } from "zod";

// --- Wire schemas ------------------------------------------------------------

/** parent → shell: render this artifact's HTML. The ONLY downward message. */
export const renderMessageSchema = z.object({
  type: z.literal("render"),
  html: z.string(),
  artifactId: z.string(),
  seq: z.number().int().nonnegative(),
});
export type RenderMessage = z.infer<typeof renderMessageSchema>;

/** shell → parent: whitelisted control messages. Nothing else is ever accepted. */
export const shellReadySchema = z.object({ type: z.literal("ready") });
export const shellHeightSchema = z.object({
  type: z.literal("height"),
  height: z.number().nonnegative(),
});
export const shellRenderErrorSchema = z.object({
  type: z.literal("render_error"),
  message: z.string(),
});

export const shellMessageSchema = z.discriminatedUnion("type", [
  shellReadySchema,
  shellHeightSchema,
  shellRenderErrorSchema,
]);
export type ShellMessage = z.infer<typeof shellMessageSchema>;

/** The closed whitelist of shell→parent message types. */
export const SHELL_MESSAGE_TYPES = ["ready", "height", "render_error"] as const;
export type ShellMessageType = (typeof SHELL_MESSAGE_TYPES)[number];

// --- Structural event shapes (DOM-free) --------------------------------------

/** The slice of a `MessageEvent` the verifiers read. */
export interface MessageEventLike {
  data: unknown;
  /** The posting window. Compared by reference identity, never by origin string. */
  source?: unknown;
  /** The posting origin. `"null"` for an opaque (sandboxed) source. */
  origin?: string;
}

/** The slice of an `HTMLIFrameElement` the parent-side check reads. */
export interface IframeLike {
  contentWindow: unknown;
}

// --- Identity verifiers ------------------------------------------------------

/**
 * Parent-side check: is this event genuinely from the frame we created?
 *
 * Verifies SOURCE IDENTITY (`event.source === iframe.contentWindow`), NOT the
 * origin string — an opaque-origin frame reports `origin === "null"`, which is
 * unforgeable-by-content but useless for identity. A null/absent source or a
 * mismatched window is rejected.
 */
export function isFromShell(event: MessageEventLike, iframe: IframeLike): boolean {
  const source = event.source;
  if (source === null || source === undefined) return false;
  if (iframe.contentWindow === null || iframe.contentWindow === undefined) return false;
  return source === iframe.contentWindow;
}

/**
 * Shell-side check: is this event from our app origin, exactly?
 *
 * Exact string equality against the build-time-injected app origin. A wildcard,
 * a prefix, a differing scheme/port, or the sentinel `"null"` all fail.
 */
export function isFromAppOrigin(event: MessageEventLike, appOrigin: string): boolean {
  if (typeof event.origin !== "string") return false;
  if (appOrigin.length === 0) return false;
  return event.origin === appOrigin;
}

// --- Both-ends read helpers (identity + shape in one call) -------------------

/**
 * Parent side: return the validated shell message IFF it is from our frame AND a
 * whitelisted, well-formed control message; otherwise `null` (caller counts it as
 * `frame_message_rejected`). Never throws.
 */
export function readShellMessage(event: MessageEventLike, iframe: IframeLike): ShellMessage | null {
  if (!isFromShell(event, iframe)) return null;
  const parsed = shellMessageSchema.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}

/**
 * Shell side: return the validated render message IFF it is from the app origin
 * AND a well-formed `render` message; otherwise `null`. Never throws.
 */
export function readRenderMessage(
  event: MessageEventLike,
  appOrigin: string,
): RenderMessage | null {
  if (!isFromAppOrigin(event, appOrigin)) return null;
  const parsed = renderMessageSchema.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}
