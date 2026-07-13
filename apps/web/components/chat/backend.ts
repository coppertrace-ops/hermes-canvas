/**
 * The chat backend seam (OWNER: COURIER, plan §8 Phase 2 "live loop").
 *
 * Every component and hook in this subsystem talks to a `ChatBackend`, never to
 * Convex directly. That is the whole point of this file: today the only
 * implementation is the in-memory mock (`createMockChatBackend`); when the live
 * loop lands, a Convex-backed adapter implements this same interface — subscribing
 * to the `getUpdates` live query, posting through the human-message mutation,
 * driving uploads through `convex/files.ts` — and the render tree does not change
 * one line. The interface is intentionally small and push-based so it maps cleanly
 * onto a Convex subscription (`onUpdate`) and onto a WebSocket reconnect.
 */

import type { ChatSnapshot } from "./types";

/** A file handed to the backend for upload. Matches the DOM `File` subset used. */
export interface UploadFile {
  name: string;
  size: number;
  type: string;
  /** Optional object URL for a local image preview; the backend echoes it back. */
  previewUrl?: string;
}

/** A composed, ready-to-send message. Attachments are already uploaded (`ready`). */
export interface SendDraft {
  text: string;
  /** Ids of attachments already uploaded via `upload()`; empty for a text-only send. */
  attachmentIds: string[];
}

/** Progress + terminal callbacks for one in-flight upload. */
export interface UploadCallbacks {
  onProgress?: (fraction: number) => void;
}

/** A handle to one in-flight upload, so the composer can cancel it. */
export interface UploadHandle {
  /** Local id assigned to the attachment; stable across the upload lifecycle. */
  id: string;
  /** Resolves with the final id when ready; rejects with a message on failure. */
  done: Promise<{ id: string }>;
  /** Abort the upload; the attachment is dropped from the draft. */
  cancel: () => void;
}

/**
 * The contract every chat data source satisfies.
 *
 * `subscribe` is the live view: it invokes the listener immediately with the
 * current snapshot and again on every change, and returns an unsubscribe. `send`
 * / `retry` are optimistic — the outgoing message appears in the snapshot as
 * `sending` and transitions to `complete` or `error`. `upload` enforces its own
 * guard server-side but reports progress the composer renders.
 */
export interface ChatBackend {
  subscribe(listener: (snapshot: ChatSnapshot) => void): () => void;
  send(draft: SendDraft): Promise<void>;
  /** Retry a previously failed outgoing message by its local id. */
  retry(messageId: string): Promise<void>;
  /** Begin an attachment upload, reporting progress; enforces the size guard. */
  upload(file: UploadFile, callbacks?: UploadCallbacks): UploadHandle;
  /**
   * Load an older page of history (scroll-up). Returns true if any items were
   * added. Optional — mock backends without history paging may omit it.
   */
  loadOlder?(): Promise<boolean>;
}
