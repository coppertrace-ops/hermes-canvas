/**
 * Chat view-model types (OWNER: COURIER, plan §7 / §2 / §8 Phase 2).
 *
 * These are the shapes the presentational chat components render. They are
 * DERIVED from `@hermes/contract` (the wire/record types) but deliberately
 * distinct: the UI needs a couple of client-only states the server never stores
 * (an outgoing message that is still `sending` or has `error`ed and can be
 * retried; an attachment mid-`uploading`). Keeping a view-model layer here is
 * what lets the mock backend and a later Convex-backed adapter feed the same
 * components without either one leaking into the render tree.
 */

import type { EventActor, EventKind, EventRefs } from "@hermes/contract";

/** Author of a chat message. Mirrors the contract `messages.role`. */
export type ChatRole = "human" | "agent";

/**
 * Delivery state of a message as the UI understands it.
 *
 * - `streaming` / `complete` mirror the server record (an assistant reply being
 *   streamed in, or a finished message).
 * - `sending` / `error` are client-only, only ever set on the human's own
 *   outgoing message: optimistic echo before the server acks, and the honest
 *   failure state that surfaces a retry affordance. A blocked send is visible,
 *   never a silent drop (the same "evidence not silence" rule the ledger uses).
 */
export type MessageStatus = "sending" | "streaming" | "complete" | "error";

/** MIME + size + lifecycle for one attachment, from pick through serve. */
export type AttachmentStatus = "pending" | "uploading" | "ready" | "error";

export interface AttachmentView {
  /** Local id while pending/uploading; the storage/file id once ready. */
  id: string;
  name: string;
  mime: string;
  /** Size in bytes (the value the 10 MB client guard is measured against). */
  size: number;
  status: AttachmentStatus;
  /** Upload progress in [0, 1]; present while `uploading`. */
  progress?: number;
  /** Human-readable failure reason; present when `status === "error"`. */
  error?: string;
  /**
   * Object URL for a local image preview, if the file is an image and a preview
   * was created client-side. Never a server URL — previews are local bytes only,
   * so an attachment never renders inline from the serving origin (plan §4).
   */
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  body: string;
  status: MessageStatus;
  attachments: AttachmentView[];
  /** Epoch ms the message became visible. */
  at: number;
  /**
   * Failure reason, set only when `status === "error"` on the human's own outgoing
   * message. Surfaced with a retry affordance — a blocked send is visible, never a
   * silent drop.
   */
  error?: string;
}

/**
 * A system-event row in the chat feed ("Hermes updated *Design notes* → v12").
 * Derived from a contract `FeedEvent`; `summary` is the pre-rendered human line
 * (see `describeSystemEvent`) so the row component stays purely presentational.
 */
export interface SystemEvent {
  id: string;
  kind: EventKind;
  actor: EventActor;
  refs: EventRefs;
  at: number;
  summary: string;
}

/** One item in the merged chat timeline: a message or a system event. */
export type ChatItem =
  { kind: "message"; message: ChatMessage } | { kind: "system"; event: SystemEvent };

/**
 * Live-connection state driving the reconnect banner. The Phase-2 gate (G2)
 * requires that a mid-stream network kill reconnects to a consistent state; the
 * UI must show that it is reconnecting rather than pretend nothing happened.
 */
export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

/** The full snapshot a backend pushes to the UI on every change. */
export interface ChatSnapshot {
  items: ChatItem[];
  connection: ConnectionState;
  /** Older history exists above the current window (scroll-up). */
  hasMoreOlder?: boolean;
  /** True while a scroll-up page load is in flight. */
  loadingOlder?: boolean;
}
