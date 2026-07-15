"use client";

/**
 * Live chat backend (OWNER: PROOF integration).
 *
 * A Convex-backed {@link ChatBackend} — the same seam COURIER's mock implements,
 * so `ChatProvider`/`ChatPane` render against it unchanged.
 *
 * Chat history is iMessage-style:
 *  - Live-subscribe to the most recent page (`listRecentMessages`).
 *  - Open at the latest messages; scroll-up calls `listMessagesBefore`.
 *  - Does NOT dump the entire event log into the transcript (that put users at
 *    the top of hundreds of telemetry rows).
 *
 * Outgoing sends are optimistic: the human message appears immediately as
 * `sending`, and is reconciled away once the server feed delivers its committed
 * copy.
 *
 * Attachments are a two-step upload (`generateUploadUrl` → POST bytes →
 * `bindAttachment`) whose bound ids ride along with `sendMessage`; the same ids
 * are reused on retry so an ambiguous send cannot double-post OR re-upload.
 * Received attachments carry only their id in the feed, so their display metadata
 * (name/size) is resolved through the owner-guarded `listAttachmentsMeta` query
 * and cached. Downloads are authenticated fetches (the bytes are owner-guarded, so
 * a plain anchor href gets a 401 — see {@link buildDownloadRequest}).
 */

import type { ApiError, FeedEvent, FeedMessage } from "@hermes/contract";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ToolCallDto } from "../../convex/canvas";
import type { AttachmentMeta } from "../../convex/files";
import {
  buildTimeline,
  describeSystemEvent,
  formatBytes,
  isSystemLineKind,
  MAX_ATTACHMENT_BYTES,
} from "../chat";
import type {
  AttachmentView,
  ChatBackend,
  ChatItem,
  ChatMessage,
  ChatSnapshot,
  ConnectionState,
  SendDraft,
  SystemEvent,
  ToolCall,
  UploadCallbacks,
  UploadFile,
  UploadHandle,
} from "../chat";

const PAGE_SIZE = 40;
/** Bounded slice of most-recent system-event lines to interleave into the feed. */
const EVENTS_LIMIT = 50;
/** Bounded slice of most-recent tool-call receipts to interleave as live rows. */
const TOOL_CALLS_LIMIT = 50;

/** Structural subset of Convex's connection state we map from. */
interface ConvexConnState {
  isWebSocketConnected: boolean;
  hasEverConnected: boolean;
}

/**
 * Map Convex's transport state onto the UI's {@link ConnectionState} so the
 * reconnect banner is honest in live mode (previously it only ever went
 * connecting→live and the banner was dead code):
 *  - socket up            → live
 *  - never yet connected  → connecting (first-load spinner)
 *  - dropped + offline     → offline (waiting on the network)
 *  - dropped + online      → reconnecting (client is retrying)
 */
export function mapConnection(cs: ConvexConnState): ConnectionState {
  if (cs.isWebSocketConnected) return "live";
  if (!cs.hasEverConnected) return "connecting";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  return "reconnecting";
}

/** A stable per-message client id so an ambiguous send/retry can't double-post. */
function newTurnId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Build the authenticated download request for an attachment. The human download
 * route (`GET <convex-site>/attachments/:id`) requires the owner identity, which
 * Convex Auth carries as an `Authorization: Bearer <token>` header — NOT a cookie.
 * A plain `<a href>` download therefore gets a 401; the bytes must be fetched with
 * the token attached, then saved from the resulting blob. This pure helper is the
 * URL + header construction (unit-tested); the fetch/save is the thin wrapper in
 * `downloadAttachment`.
 */
export function buildDownloadRequest(
  baseUrl: string,
  id: string,
  token: string | null,
): { url: string; headers: Record<string, string> } {
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/attachments/${encodeURIComponent(id)}`;
  return { url, headers: token ? { Authorization: `Bearer ${token}` } : {} };
}

/**
 * Turn a failed `bindAttachment` outcome into a human line. Oversize names the
 * limit (plan §2.2: "visible rejection with the limit named, never truncation"),
 * even though the client guard normally rejects an oversize file before upload —
 * this is the server's authoritative refusal surfaced honestly.
 */
export function bindErrorMessage(fileName: string, error: ApiError): string {
  if (error.code === "oversize") {
    const raw = (error.detail as { limit_value?: unknown } | undefined)?.limit_value;
    const limit = typeof raw === "number" ? raw : MAX_ATTACHMENT_BYTES;
    return `“${fileName}” is over the ${formatBytes(limit)} limit.`;
  }
  if (error.code === "not_found") {
    return `“${fileName}” could not be saved (the upload expired). Try again.`;
  }
  return error.message || `“${fileName}” could not be attached.`;
}

/**
 * The default byte uploader: a Convex storage POST with real upload progress via
 * XHR (fetch has no upload-progress event). Resolves the storage id from the JSON
 * body. Abortable through the passed signal so the composer's cancel is honored
 * mid-transfer. Injectable via {@link ConvexChatBackendOptions.putBytes} for tests.
 */
function defaultPutBytes(
  url: string,
  blob: Blob,
  opts: { onProgress?: (fraction: number) => void; signal: AbortSignal },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (blob.type) xhr.setRequestHeader("Content-Type", blob.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { storageId?: unknown };
          if (typeof parsed.storageId === "string") resolve(parsed.storageId);
          else reject(new Error("upload response missing storageId"));
        } catch {
          reject(new Error("upload response was not valid JSON"));
        }
      } else {
        reject(new Error(`upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.onabort = () => reject(new Error("cancelled"));
    opts.signal.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
}

/** Save a fetched blob to the user's machine via a transient object URL. */
function triggerBrowserDownload(blob: Blob, name: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has consumed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface Optimistic {
  draft: SendDraft;
  status: "sending" | "error";
  at: number;
  error?: string;
  /** Client-generated idempotency key; identical across the send and every retry. */
  turnId: string;
  /** Server id once the mutation acks — used to reconcile against the feed. */
  serverId?: string;
}

/** The authenticated attachment-serving origin + a token getter for downloads. */
export interface AttachmentEndpoint {
  /** The Convex `.site` origin that serves `/attachments/:id`. */
  baseUrl: string;
  /** Current owner auth token (may refresh); read fresh per download. */
  getToken: () => string | null | Promise<string | null>;
}

/**
 * System-event source override for the live transcript.
 *
 * By default the backend live-subscribes to `canvas.listRecentEvents` (a bounded,
 * owner-guarded slice of the most recent {@link EVENTS_LIMIT} events) and maps them
 * through `describeSystemEvent`, keeping only `isSystemLineKind`. This option lets
 * a caller (or a test) substitute a synchronous reader instead.
 */
export interface ConvexChatBackendOptions {
  systemEvents?: () => SystemEvent[];
  /**
   * Tool-call source override. By default the backend live-subscribes to
   * `canvas.listRecentToolCalls` (owner-guarded, bounded slice) and maps the wire
   * DTOs to {@link ToolCall} view models. A test may substitute a synchronous reader.
   */
  toolCalls?: () => ToolCall[];
  /** Enables authenticated attachment downloads; omit to hide the affordance. */
  attachmentEndpoint?: AttachmentEndpoint;
  /** Injectable byte uploader (tests). Defaults to {@link defaultPutBytes}. */
  putBytes?: (
    url: string,
    blob: Blob,
    opts: { onProgress?: (fraction: number) => void; signal: AbortSignal },
  ) => Promise<string>;
  /** Injectable metadata reader (tests). Defaults to `listAttachmentsMeta`. */
  attachmentMeta?: (ids: string[]) => Promise<AttachmentMeta[]>;
}

/**
 * Map a bounded FeedEvent page to the system-line rows the timeline renders.
 * Tolerates a missing/not-yet-loaded result (a live query is `undefined` before its
 * first snapshot) by treating anything non-array as an empty slice.
 */
function toSystemLines(events: FeedEvent[] | null | undefined): SystemEvent[] {
  if (!Array.isArray(events)) return [];
  return events.filter((e) => isSystemLineKind(e.kind)).map(describeSystemEvent);
}

/** Map a tool-call wire DTO to the chat view model (snake -> camel; sort key). */
function toToolCall(d: ToolCallDto): ToolCall {
  return {
    id: d.tool_call_id,
    tool: d.tool,
    status: d.status,
    argsSummary: d.args_summary,
    resultTail: d.result_tail,
    errorMessage: d.error_message,
    sessionId: d.session_id,
    turnId: d.turn_id,
    startedAt: d.started_at,
    finishedAt: d.finished_at,
    durationMs: d.duration_ms,
    // Timeline sort key: when the call started, or last-updated if the reporter
    // omitted started_at (a completed-only receipt).
    at: d.started_at ?? d.updated_at,
    updatedAt: d.updated_at,
  };
}

/** Tolerate a not-yet-loaded live query (undefined before its first snapshot). */
function toToolCalls(rows: ToolCallDto[] | null | undefined): ToolCall[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(toToolCall);
}

function mergeById(older: FeedMessage[], recent: FeedMessage[]): FeedMessage[] {
  const map = new Map<string, FeedMessage>();
  for (const m of older) map.set(m.message_id, m);
  for (const m of recent) map.set(m.message_id, m);
  return [...map.values()].sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    return a.message_id < b.message_id ? -1 : a.message_id > b.message_id ? 1 : 0;
  });
}

/** Every distinct attachment id referenced by a batch of feed messages. */
function collectAttachmentIds(msgs: FeedMessage[]): string[] {
  const ids: string[] = [];
  for (const m of msgs) if (m.attachments) ids.push(...m.attachments);
  return ids;
}

export function createConvexChatBackend(
  client: ConvexReactClient,
  options: ConvexChatBackendOptions = {},
): ChatBackend {
  let recent: FeedMessage[] = [];
  let older: FeedMessage[] = [];
  let liveSystemEvents: SystemEvent[] = [];
  /** Override wins (tests / custom callers); otherwise the live event slice. */
  const systemEvents = options.systemEvents ?? (() => liveSystemEvents);
  let liveToolCalls: ToolCall[] = [];
  const toolCalls = options.toolCalls ?? (() => liveToolCalls);
  const endpoint = options.attachmentEndpoint;
  const putBytes = options.putBytes ?? defaultPutBytes;
  const readMeta =
    options.attachmentMeta ?? ((ids: string[]) => client.query(api.files.listAttachmentsMeta, { ids }));
  /** Resolved attachment display metadata (name/size/mime), keyed by attachment id. */
  const metaCache = new Map<string, AttachmentMeta>();
  /** Attachment ids we have already asked the server about, to avoid re-querying. */
  const metaRequested = new Set<string>();
  let oldestEventSeq: number | null = null;
  let hasMoreOlder = false;
  let loadingOlder = false;
  let connection: ConnectionState = "connecting";
  const optimistic = new Map<string, Optimistic>();
  const listeners = new Set<(s: ChatSnapshot) => void>();
  let counter = 0;
  let loadOlderInflight: Promise<boolean> | null = null;

  /** Build the chip views for a message's attachment ids from the metadata cache. */
  function resolveAttachmentViews(ids: string[] | undefined): AttachmentView[] {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => {
      const meta = metaCache.get(id);
      return {
        id,
        name: meta?.name ?? "Attachment",
        mime: meta?.mime ?? "application/octet-stream",
        size: meta?.size ?? 0,
        status: "ready" as const,
      };
    });
  }

  /** Fetch metadata for any not-yet-known attachment ids, then re-emit. */
  function ensureMeta(ids: string[]): void {
    const missing = ids.filter((id) => !metaCache.has(id) && !metaRequested.has(id));
    if (missing.length === 0) return;
    for (const id of missing) metaRequested.add(id);
    readMeta(missing)
      .then((rows) => {
        if (rows.length === 0) return;
        for (const row of rows) metaCache.set(row.id, row);
        emit();
      })
      .catch(() => {
        // A failed lookup just leaves the generic "Attachment" chip; allow a retry
        // on the next snapshot rather than pinning the ids as permanently requested.
        for (const id of missing) metaRequested.delete(id);
      });
  }

  function toChatMessage(m: FeedMessage): ChatMessage {
    return {
      id: m.message_id,
      role: m.role,
      body: m.body,
      status: m.status,
      attachments: resolveAttachmentViews(m.attachments),
      at: m.at,
    };
  }

  function reconcile() {
    const ids = new Set([...older, ...recent].map((m) => m.message_id));
    for (const [localId, o] of optimistic) {
      if (o.serverId && ids.has(o.serverId)) optimistic.delete(localId);
    }
  }

  function buildItems(): ChatItem[] {
    const serverMsgs = mergeById(older, recent).map(toChatMessage);
    const pending: ChatMessage[] = [...optimistic.entries()].map(([id, o]) => ({
      id,
      role: "human",
      body: o.draft.text,
      status: o.status,
      attachments: resolveAttachmentViews(o.draft.attachmentIds),
      at: o.at,
      error: o.error,
    }));
    // System lines come from the bounded, owner-guarded recent-events slice — never
    // the full event log (that was the "open at top of hundreds of rows" failure).
    // Tool-call rows come from the parallel bounded slice and interleave by time.
    return buildTimeline([...serverMsgs, ...pending], systemEvents(), toolCalls());
  }

  function snapshot(): ChatSnapshot {
    return {
      connection,
      items: buildItems(),
      hasMoreOlder,
      loadingOlder,
    };
  }
  function emit() {
    const s = snapshot();
    for (const l of listeners) l(s);
  }

  // Live tail: always the most recent PAGE_SIZE messages.
  const watch = client.watchQuery(api.canvas.listRecentMessages, { limit: PAGE_SIZE });
  function applyRecent() {
    const res = watch.localQueryResult();
    if (!res) return;
    recent = res.messages;
    // Only seed oldest/hasMore from the live page until the user has paged up.
    if (older.length === 0) {
      oldestEventSeq = res.oldest_event_seq;
      hasMoreOlder = res.has_more;
    }
    reconcile();
    ensureMeta(collectAttachmentIds(recent));
    emit();
  }
  watch.onUpdate(() => applyRecent());
  applyRecent();

  // Live tail of recent system-event lines (bounded + owner-guarded). Skipped when
  // a caller supplies its own `systemEvents` reader (e.g. tests).
  if (!options.systemEvents) {
    const eventsWatch = client.watchQuery(api.canvas.listRecentEvents, { limit: EVENTS_LIMIT });
    const applyEvents = () => {
      const res = eventsWatch.localQueryResult();
      if (!res) return;
      liveSystemEvents = toSystemLines(res);
      emit();
    };
    eventsWatch.onUpdate(applyEvents);
    applyEvents();
  }

  // Live tail of recent tool-call receipts (bounded + owner-guarded). Skipped when
  // a caller supplies its own `toolCalls` reader (e.g. tests).
  if (!options.toolCalls) {
    const toolCallsWatch = client.watchQuery(api.canvas.listRecentToolCalls, { limit: TOOL_CALLS_LIMIT });
    const applyToolCalls = () => {
      const res = toolCallsWatch.localQueryResult();
      if (!res) return;
      liveToolCalls = toToolCalls(res);
      emit();
    };
    toolCallsWatch.onUpdate(applyToolCalls);
    applyToolCalls();
  }

  // Drive the reconnect banner from the live transport, not from query arrival.
  connection = mapConnection(client.connectionState());
  client.subscribeToConnectionState((cs) => {
    const next = mapConnection(cs);
    if (next !== connection) {
      connection = next;
      emit();
    }
  });

  async function loadOlder(): Promise<boolean> {
    if (loadingOlder || !hasMoreOlder || oldestEventSeq == null) return false;
    if (loadOlderInflight) return loadOlderInflight;

    loadingOlder = true;
    emit();

    loadOlderInflight = (async () => {
      try {
        const page = await client.query(api.canvas.listMessagesBefore, {
          before_event_seq: oldestEventSeq!,
          limit: PAGE_SIZE,
        });
        if (page.messages.length === 0) {
          hasMoreOlder = false;
          return false;
        }
        // Prepend older page (dedupe against what we already hold).
        const known = new Set([...older, ...recent].map((m) => m.message_id));
        const fresh = page.messages.filter((m) => !known.has(m.message_id));
        older = [...fresh, ...older];
        if (page.oldest_event_seq != null) oldestEventSeq = page.oldest_event_seq;
        hasMoreOlder = page.has_more;
        reconcile();
        ensureMeta(collectAttachmentIds(fresh));
        return fresh.length > 0;
      } catch {
        return false;
      } finally {
        loadingOlder = false;
        loadOlderInflight = null;
        emit();
      }
    })();

    return loadOlderInflight;
  }

  function dispatch(localId: string): Promise<void> {
    const o = optimistic.get(localId);
    if (!o) return Promise.resolve();
    const ids = o.draft.attachmentIds;
    return client
      .mutation(api.human.sendMessage, {
        text: o.draft.text,
        turn_id: o.turnId,
        // Same ids on the send and every retry: the server dedupes on turn_id, so a
        // retry never re-binds or double-attaches.
        ...(ids.length > 0 ? { attachments: ids } : {}),
      })
      .then((res) => {
        const cur = optimistic.get(localId);
        if (!cur) return;
        if (res && res.ok) {
          cur.serverId = res.message_id;
          reconcile();
        } else {
          cur.status = "error";
          cur.error = "Message was rejected.";
        }
        emit();
      })
      .catch(() => {
        const cur = optimistic.get(localId);
        if (cur) {
          cur.status = "error";
          cur.error = "Failed to send.";
          emit();
        }
      });
  }

  function send(draft: SendDraft): Promise<void> {
    const localId = `local_${(counter += 1)}`;
    optimistic.set(localId, { draft, status: "sending", at: Date.now(), turnId: newTurnId() });
    // Resolve chip metadata for the optimistic bubble (the ids were just bound, so
    // this is usually a cache hit from `upload`).
    ensureMeta(draft.attachmentIds);
    emit();
    return dispatch(localId);
  }

  function retry(messageId: string): Promise<void> {
    const o = optimistic.get(messageId);
    if (!o) return Promise.resolve();
    o.status = "sending";
    o.error = undefined;
    emit();
    return dispatch(messageId);
  }

  function upload(file: UploadFile, callbacks?: UploadCallbacks): UploadHandle {
    const localId = `att_${(counter += 1)}`;
    const controller = new AbortController();
    let cancelled = false;

    const done: Promise<{ id: string }> = (async () => {
      // The live adapter needs the raw bytes. The Composer passes a real DOM `File`
      // (which is a `Blob`); `UploadFile` is only the File subset the mock reads.
      if (!(file instanceof Blob)) {
        throw new Error("Attachment has no file data to upload.");
      }
      const uploadUrl = await client.mutation(api.files.generateUploadUrl, {});
      if (cancelled) throw new Error("cancelled");
      const storageId = await putBytes(uploadUrl, file, {
        onProgress: callbacks?.onProgress,
        signal: controller.signal,
      });
      if (cancelled) throw new Error("cancelled");
      const res = await client.mutation(api.files.bindAttachment, {
        storage_id: storageId,
        name: file.name,
        ...(file.type ? { mime: file.type } : {}),
      });
      if (!res.ok) throw new Error(bindErrorMessage(file.name, res.error));
      // Cache so the optimistic + committed bubbles render the chip with no extra
      // round-trip; mark as requested so `ensureMeta` won't re-query it.
      metaCache.set(res.attachment_id, {
        id: res.attachment_id,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: res.size,
      });
      metaRequested.add(res.attachment_id);
      return { id: res.attachment_id };
    })();

    return {
      id: localId,
      done,
      cancel: () => {
        cancelled = true;
        controller.abort();
      },
    };
  }

  async function downloadAttachment(id: string, name: string): Promise<void> {
    if (!endpoint) throw new Error("Attachment downloads aren’t configured.");
    const token = await endpoint.getToken();
    const { url, headers } = buildDownloadRequest(endpoint.baseUrl, id, token ?? null);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(res.status === 401 ? "Please sign in to download this attachment." : `Download failed (${res.status}).`);
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, name);
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
    loadOlder,
    // Only expose downloads when an authenticated endpoint is configured, so the UI
    // shows the affordance exactly when it can actually serve the bytes.
    ...(endpoint ? { downloadAttachment } : {}),
  };
}
