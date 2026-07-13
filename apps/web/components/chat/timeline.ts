/**
 * Timeline assembly (OWNER: COURIER).
 *
 * Pure merge of message bubbles and system-event lines into the single ordered
 * feed the list renders. Kept DOM-free and side-effect-free so it unit-tests
 * exhaustively and so BOTH backends reuse it: the mock builds its snapshot with
 * this, and a later Convex adapter maps its live `messages` + `events` through the
 * exact same function — the ordering rule lives in one place, not two.
 */

import type { ChatItem, ChatMessage, SystemEvent } from "./types";

/** Stable sort key: primary by time, tie-broken so ordering is deterministic. */
function keyOf(item: ChatItem): [number, number, string] {
  if (item.kind === "message") {
    // Messages tie-break after same-instant system lines, then by id.
    return [item.message.at, 1, item.message.id];
  }
  // System events carry a global seq — the strongest tie-break available.
  return [item.event.at, 0, `evt_${item.event.kind}_${item.event.at}_${item.event.id}`];
}

/**
 * Merge messages and system events into one ascending timeline.
 *
 * Ordering is by `at` (epoch ms); on an exact tie a system line sorts before a
 * message, then a stable id comparison breaks any remaining ties. The result is
 * deterministic regardless of input order, which matters for a live feed whose
 * two streams (messages, events) arrive interleaved and out of order on reconnect.
 */
export function buildTimeline(messages: ChatMessage[], events: SystemEvent[]): ChatItem[] {
  const items: ChatItem[] = [
    ...messages.map((message): ChatItem => ({ kind: "message", message })),
    ...events.map((event): ChatItem => ({ kind: "system", event })),
  ];
  return items.sort((a, b) => {
    const [at, rank, id] = keyOf(a);
    const [bt, brank, bid] = keyOf(b);
    if (at !== bt) return at - bt;
    if (rank !== brank) return rank - brank;
    return id < bid ? -1 : id > bid ? 1 : 0;
  });
}
