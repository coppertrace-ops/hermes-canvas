"use client";

/**
 * Live chat backend (OWNER: PROOF integration).
 *
 * A Convex-backed {@link ChatBackend} — the same seam COURIER's mock implements,
 * so `ChatProvider`/`ChatPane` render against it unchanged. It subscribes to the
 * public `canvas.getUpdates` live query for the message + event feed and posts
 * human turns through the new `human.sendMessage` mutation. It deliberately does
 * NOT fabricate an assistant reply: a send creates a pending human turn that the
 * real Hermes agent loop answers through its own write path; until it does, the
 * transcript honestly shows only the human message.
 *
 * Outgoing sends are optimistic: the human message appears immediately as
 * `sending`, and is reconciled away once the server feed delivers its committed
 * copy. A rejected/failed send surfaces as `error` with a retry affordance — a
 * blocked send is visible, never a silent drop.
 *
 * Attachments are not yet wired to the live upload path (COURIER `files.ts`), so
 * `upload` fails honestly rather than pretending to succeed.
 */

import type { FeedEvent, FeedMessage } from "@hermes/contract";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildTimeline, describeSystemEvent } from "../chat";
import type {
  ChatBackend,
  ChatItem,
  ChatMessage,
  ChatSnapshot,
  ConnectionState,
  SendDraft,
  SystemEvent,
  UploadFile,
  UploadHandle,
} from "../chat";

interface Optimistic {
  draft: SendDraft;
  status: "sending" | "error";
  at: number;
  error?: string;
  /** Server id once the mutation acks — used to reconcile against the feed. */
  serverId?: string;
}

export function createConvexChatBackend(client: ConvexReactClient): ChatBackend {
  let server: { messages: FeedMessage[]; events: FeedEvent[] } = { messages: [], events: [] };
  let connection: ConnectionState = "connecting";
  const optimistic = new Map<string, Optimistic>();
  const listeners = new Set<(s: ChatSnapshot) => void>();
  let counter = 0;

  function reconcile() {
    const ids = new Set(server.messages.map((m) => m.message_id));
    for (const [localId, o] of optimistic) {
      if (o.serverId && ids.has(o.serverId)) optimistic.delete(localId);
    }
  }

  function buildItems(): ChatItem[] {
    const serverMsgs: ChatMessage[] = server.messages.map((m) => ({
      id: m.message_id,
      role: m.role,
      body: m.body,
      status: m.status,
      attachments: [],
      at: m.at,
    }));
    const pending: ChatMessage[] = [...optimistic.entries()].map(([id, o]) => ({
      id,
      role: "human",
      body: o.draft.text,
      status: o.status,
      attachments: [],
      at: o.at,
      error: o.error,
    }));
    const events: SystemEvent[] = server.events
      .filter((e) => e.kind !== "message")
      .map((e) => describeSystemEvent(e));
    return buildTimeline([...serverMsgs, ...pending], events);
  }

  function snapshot(): ChatSnapshot {
    return { connection, items: buildItems() };
  }
  function emit() {
    const s = snapshot();
    for (const l of listeners) l(s);
  }

  // A single long-lived subscription to the feed. Reconnect handling is Convex's;
  // we surface "live" once the first snapshot lands.
  const watch = client.watchQuery(api.canvas.getUpdates, { cursor: 0 });
  function applyResult() {
    const res = watch.localQueryResult();
    if (!res) return;
    server = { messages: res.messages, events: res.events };
    connection = "live";
    reconcile();
    emit();
  }
  watch.onUpdate(() => applyResult());
  applyResult();

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
    void file; // uploads are not yet wired to the live path (COURIER files.ts).
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
  };
}
