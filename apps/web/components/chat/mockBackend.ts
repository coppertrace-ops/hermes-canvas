/**
 * In-memory mock chat backend (OWNER: COURIER).
 *
 * The only `ChatBackend` implementation that exists pre-integration. It powers
 * local development, Storybook-style manual QA, and the unit tests — and it is
 * the proof that the seam is real: the components below never learn whether their
 * data came from here or from Convex.
 *
 * Two modes:
 *  - `auto: true` (default) drives a lifelike demo — sends are acked on a timer,
 *    the agent streams a canned reply, uploads progress to completion.
 *  - `auto: false` freezes all of that behind an explicit driver API
 *    (`ackSend`, `streamAgent`, `progressUpload`, `resolveUpload`, `setConnection`
 *    …) so tests advance state deterministically with no real timers.
 */

import type { FeedEvent } from "@hermes/contract";
import type { ChatBackend, SendDraft, UploadCallbacks, UploadFile, UploadHandle } from "./backend";
import { describeSystemEvent } from "./events";
import type { AttachmentView, ChatItem, ChatMessage, ChatSnapshot, ConnectionState, ToolCall } from "./types";

export interface MockBackendOptions {
  /** Auto-drive acks/replies/uploads on timers. Default true; tests pass false. */
  auto?: boolean;
  /** Delay (ms) used by auto mode. Ignored when `auto` is false. */
  latencyMs?: number;
  /** Seed items to render on first snapshot. */
  initialItems?: ChatItem[];
  /** Seed connection state. Default "live". */
  initialConnection?: ConnectionState;
}

/** Deterministic control surface exposed for tests and manual QA. */
export interface MockChatBackend extends ChatBackend {
  /** Current snapshot (a copy). */
  snapshot(): ChatSnapshot;
  /** Force a connection state (drives the reconnect banner). */
  setConnection(state: ConnectionState): void;
  /** Ack the given outgoing message id: `sending` → `complete`. */
  ackSend(messageId: string): void;
  /** Fail the given outgoing message id: → `error` (retryable). */
  failSend(messageId: string, error?: string): void;
  /** Append a finished agent message. Returns its id. */
  pushAgentMessage(body: string): string;
  /** Start a streaming agent message; returns handles to feed it. */
  streamAgent(): { id: string; delta: (chunk: string) => void; done: () => void };
  /** Append a system-event row from a contract feed event. */
  pushEvent(event: FeedEvent): void;
  /**
   * Upsert a tool-call receipt by `id` (mirrors the live edit-in-place behaviour):
   * the first call inserts a row, a later call with the same id updates it.
   */
  pushToolCall(toolCall: ToolCall): void;
  /** Advance an in-flight upload's progress in [0, 1]. */
  progressUpload(id: string, fraction: number): void;
  /** Resolve an in-flight upload: `uploading` → `ready`. */
  resolveUpload(id: string): void;
  /** Fail an in-flight upload: → `error`. */
  failUpload(id: string, error?: string): void;
}

export function createMockChatBackend(opts: MockBackendOptions = {}): MockChatBackend {
  const auto = opts.auto ?? true;
  const latency = opts.latencyMs ?? 450;

  let connection: ConnectionState = opts.initialConnection ?? "live";
  const items: ChatItem[] = [...(opts.initialItems ?? [])];
  const listeners = new Set<(s: ChatSnapshot) => void>();
  /** Upload id → live progress callbacks, so driver methods can report progress. */
  const uploadCbs = new Map<string, UploadCallbacks>();
  /** Last-known draft per outgoing message id, for retry. */
  const outgoingDrafts = new Map<string, SendDraft>();

  let counter = 0;
  const nextId = (prefix: string) => `${prefix}_${(counter += 1)}`;
  const now = () => Date.now();

  function snapshot(): ChatSnapshot {
    return { connection, items: items.map(cloneItem) };
  }
  function emit() {
    const snap = snapshot();
    for (const l of listeners) l(snap);
  }

  function findMessage(id: string): ChatMessage | undefined {
    const item = items.find((i) => i.kind === "message" && i.message.id === id);
    return item && item.kind === "message" ? item.message : undefined;
  }

  function resolveAttachments(ids: string[]): AttachmentView[] {
    // In the mock, an attachment id carries no stored metadata once "ready"; we
    // synthesize a minimal ready view so the bubble shows the chip. A real
    // adapter would read the attachment record here.
    return ids.map((id) => ({
      id,
      name: id,
      mime: "application/octet-stream",
      size: 0,
      status: "ready" as const,
    }));
  }

  // --- ChatBackend ---------------------------------------------------------

  function send(draft: SendDraft): Promise<void> {
    const id = nextId("msg");
    outgoingDrafts.set(id, draft);
    const msg: ChatMessage = {
      id,
      role: "human",
      body: draft.text,
      status: "sending",
      attachments: resolveAttachments(draft.attachmentIds),
      at: now(),
    };
    items.push({ kind: "message", message: msg });
    emit();
    if (auto) {
      setTimeout(() => {
        ackSend(id);
        autoReply();
      }, latency);
    }
    return Promise.resolve();
  }

  function retry(messageId: string): Promise<void> {
    const msg = findMessage(messageId);
    if (!msg) return Promise.resolve();
    msg.status = "sending";
    emit();
    if (auto) setTimeout(() => ackSend(messageId), latency);
    return Promise.resolve();
  }

  function upload(file: UploadFile, callbacks?: UploadCallbacks): UploadHandle {
    const id = nextId("att");
    if (callbacks) uploadCbs.set(id, callbacks);
    let cancelled = false;
    let resolveDone: (v: { id: string }) => void = () => {};
    let rejectDone: (e: Error) => void = () => {};
    const done = new Promise<{ id: string }>((res, rej) => {
      resolveDone = res;
      rejectDone = rej;
    });
    // Bridge driver methods to this handle's promise.
    uploadResolvers.set(id, {
      resolve: () => resolveDone({ id }),
      reject: (m) => rejectDone(new Error(m)),
    });

    if (auto) {
      let pct = 0;
      const tick = setInterval(
        () => {
          if (cancelled) {
            clearInterval(tick);
            return;
          }
          pct = Math.min(1, pct + 0.34);
          progressUpload(id, pct);
          if (pct >= 1) {
            clearInterval(tick);
            resolveUpload(id);
          }
        },
        Math.max(1, Math.floor(latency / 3)),
      );
    }
    void file;
    return {
      id,
      done,
      cancel: () => {
        cancelled = true;
        uploadCbs.delete(id);
        uploadResolvers.delete(id);
      },
    };
  }

  // --- driver --------------------------------------------------------------

  const uploadResolvers = new Map<string, { resolve: () => void; reject: (m: string) => void }>();

  function setConnection(state: ConnectionState) {
    connection = state;
    emit();
  }
  function ackSend(messageId: string) {
    const msg = findMessage(messageId);
    if (msg && msg.status !== "complete") {
      msg.status = "complete";
      emit();
    }
  }
  function failSend(messageId: string, error = "Failed to send.") {
    const msg = findMessage(messageId);
    if (msg) {
      msg.status = "error";
      msg.error = error;
      emit();
    }
  }
  function pushAgentMessage(body: string): string {
    const id = nextId("msg");
    items.push({
      kind: "message",
      message: { id, role: "agent", body, status: "complete", attachments: [], at: now() },
    });
    emit();
    return id;
  }
  function streamAgent() {
    const id = nextId("msg");
    const msg: ChatMessage = {
      id,
      role: "agent",
      body: "",
      status: "streaming",
      attachments: [],
      at: now(),
    };
    items.push({ kind: "message", message: msg });
    emit();
    return {
      id,
      delta: (chunk: string) => {
        msg.body += chunk;
        emit();
      },
      done: () => {
        msg.status = "complete";
        emit();
      },
    };
  }
  function pushEvent(event: FeedEvent) {
    items.push({ kind: "system", event: describeSystemEvent(event) });
    emit();
  }
  function pushToolCall(toolCall: ToolCall) {
    const idx = items.findIndex((i) => i.kind === "tool" && i.toolCall.id === toolCall.id);
    if (idx >= 0) items[idx] = { kind: "tool", toolCall };
    else items.push({ kind: "tool", toolCall });
    emit();
  }
  function progressUpload(id: string, fraction: number) {
    const cb = uploadCbs.get(id);
    cb?.onProgress?.(Math.max(0, Math.min(1, fraction)));
  }
  function resolveUpload(id: string) {
    uploadResolvers.get(id)?.resolve();
    uploadCbs.delete(id);
    uploadResolvers.delete(id);
  }
  function failUpload(id: string, error = "Upload failed.") {
    uploadResolvers.get(id)?.reject(error);
    uploadCbs.delete(id);
    uploadResolvers.delete(id);
  }

  function autoReply() {
    const stream = streamAgent();
    const words = ["Got", "it", "—", "working", "on", "that", "now."];
    let i = 0;
    const tick = setInterval(
      () => {
        if (i >= words.length) {
          clearInterval(tick);
          stream.done();
          return;
        }
        stream.delta((i === 0 ? "" : " ") + words[i]);
        i += 1;
      },
      Math.max(1, Math.floor(latency / 4)),
    );
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    send,
    retry,
    upload,
    snapshot,
    setConnection,
    ackSend,
    failSend,
    pushAgentMessage,
    streamAgent,
    pushEvent,
    pushToolCall,
    progressUpload,
    resolveUpload,
    failUpload,
  };
}

function cloneItem(item: ChatItem): ChatItem {
  if (item.kind === "message") {
    return {
      kind: "message",
      message: { ...item.message, attachments: item.message.attachments.map((a) => ({ ...a })) },
    };
  }
  if (item.kind === "tool") {
    return { kind: "tool", toolCall: { ...item.toolCall } };
  }
  return { kind: "system", event: { ...item.event } };
}
