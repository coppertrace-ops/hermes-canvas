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
 */

import type { FeedMessage } from "@hermes/contract";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildTimeline } from "../chat";
import type {
  ChatBackend,
  ChatItem,
  ChatMessage,
  ChatSnapshot,
  ConnectionState,
  SendDraft,
  UploadFile,
  UploadHandle,
} from "../chat";

const PAGE_SIZE = 40;

interface Optimistic {
  draft: SendDraft;
  status: "sending" | "error";
  at: number;
  error?: string;
  /** Server id once the mutation acks — used to reconcile against the feed. */
  serverId?: string;
}

function toChatMessage(m: FeedMessage): ChatMessage {
  return {
    id: m.message_id,
    role: m.role,
    body: m.body,
    status: m.status,
    attachments: [],
    at: m.at,
  };
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

export function createConvexChatBackend(client: ConvexReactClient): ChatBackend {
  let recent: FeedMessage[] = [];
  let older: FeedMessage[] = [];
  let oldestEventSeq: number | null = null;
  let hasMoreOlder = false;
  let loadingOlder = false;
  let connection: ConnectionState = "connecting";
  const optimistic = new Map<string, Optimistic>();
  const listeners = new Set<(s: ChatSnapshot) => void>();
  let counter = 0;
  let loadOlderInflight: Promise<boolean> | null = null;

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
      attachments: [],
      at: o.at,
      error: o.error,
    }));
    // Messages only — full system-event history was the "open at top of hundreds
    // of rows" failure mode. Live artifact system lines can return later.
    return buildTimeline([...serverMsgs, ...pending], []);
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
    connection = "live";
    reconcile();
    emit();
  }
  watch.onUpdate(() => applyRecent());
  applyRecent();

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
    return client
      .mutation(api.human.sendMessage, { text: o.draft.text })
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
    optimistic.set(localId, { draft, status: "sending", at: Date.now() });
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

  function upload(file: UploadFile): UploadHandle {
    void file;
    const id = `att_${(counter += 1)}`;
    return {
      id,
      done: Promise.reject(new Error("Attachments aren’t available in the live preview yet.")),
      cancel: () => {},
    };
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
  };
}
