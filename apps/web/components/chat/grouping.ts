/**
 * Transcript layout (OWNER: COURIER).
 *
 * Pure transform from the merged `ChatItem[]` timeline into the *rows* the list
 * renders: message bubbles annotated with whether they continue a group, system
 * lines, and centered day-divider rows. Grouping and dividers live here — not in
 * the render tree — so the rules unit-test exhaustively and both backends lay out
 * identically.
 *
 * Grouping rule (iMessage-style): consecutive messages from the same author within
 * `GROUP_WINDOW_MS` collapse into one group. The first message of a group carries
 * its author label + time; continuations render unlabelled and tighter. A system
 * line or a day boundary always breaks a group.
 */

import { dayKey } from "./time";
import type { ChatItem, ChatMessage, SystemEvent } from "./types";

/** Consecutive same-author messages within this window collapse into one group. */
export const GROUP_WINDOW_MS = 3 * 60 * 1000;

/** A centered date separator inserted where the timeline crosses a calendar day. */
export interface DayDividerRow {
  kind: "day-divider";
  /** Stable key derived from the day. */
  id: string;
  /** An instant on that day (epoch ms), for label formatting. */
  at: number;
}

/** A message bubble row; `grouped` continuations hide their header. */
export interface MessageRow {
  kind: "message";
  message: ChatMessage;
  /** True when this bubble continues the previous author's group (no header). */
  grouped: boolean;
}

/** A system-event line row (unchanged from the timeline). */
export interface SystemRow {
  kind: "system";
  event: SystemEvent;
}

export type TimelineRow = DayDividerRow | MessageRow | SystemRow;

/**
 * Lay the merged timeline out into renderable rows, inserting day dividers at
 * calendar-day boundaries (including before the first row) and flagging grouped
 * message continuations.
 */
export function layoutTimeline(items: ChatItem[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let prevDay: string | null = null;
  /** The immediately-preceding message row, reset by dividers and system lines. */
  let prevMessage: ChatMessage | null = null;

  for (const item of items) {
    const at = item.kind === "message" ? item.message.at : item.event.at;
    const day = dayKey(at);

    if (day !== prevDay) {
      rows.push({ kind: "day-divider", id: `day_${day}`, at });
      prevDay = day;
      prevMessage = null; // a day boundary always starts a fresh group
    }

    if (item.kind === "message") {
      const grouped =
        prevMessage !== null &&
        prevMessage.role === item.message.role &&
        item.message.at - prevMessage.at <= GROUP_WINDOW_MS;
      rows.push({ kind: "message", message: item.message, grouped });
      prevMessage = item.message;
    } else {
      rows.push({ kind: "system", event: item.event });
      prevMessage = null; // a system line breaks the run
    }
  }

  return rows;
}
