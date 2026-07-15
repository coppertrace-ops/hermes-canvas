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
import type { ChatItem, ChatMessage, SystemEvent, ToolCall } from "./types";

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

/** A single tool-call row (running, or a completed call not folded into a cluster). */
export interface ToolRow {
  kind: "tool";
  toolCall: ToolCall;
}

/**
 * A collapsed cluster of consecutive completed tool calls from one turn — the
 * anti-noise affordance so a busy turn doesn't drown the transcript in rows.
 * Always holds >= 2 calls; the row component renders "N tool calls" and expands.
 */
export interface ToolClusterRow {
  kind: "tool-cluster";
  /** Stable key derived from the first + last member ids. */
  id: string;
  tools: ToolCall[];
}

export type TimelineRow = DayDividerRow | MessageRow | SystemRow | ToolRow | ToolClusterRow;

/** Two completed calls cluster only when they share a defined turn id. */
function sameTurn(a: ToolCall, b: ToolCall): boolean {
  return a.turnId !== undefined && b.turnId !== undefined && a.turnId === b.turnId;
}

/**
 * Lay a maximal run of consecutive tool calls out into rows. A `running` call is
 * always its own visible row (never hidden inside a cluster). Consecutive
 * COMPLETED calls sharing a turn collapse into a `tool-cluster` (>= 2 members).
 * When this run is the timeline TAIL and ends in a cluster, the newest member is
 * popped back out as a visible row so the most recent activity always shows.
 */
function layoutToolRun(run: ToolCall[], isTail: boolean): TimelineRow[] {
  const out: TimelineRow[] = [];
  let i = 0;
  while (i < run.length) {
    const head = run[i]!;
    if (head.status === "running") {
      out.push({ kind: "tool", toolCall: head });
      i += 1;
      continue;
    }
    // Gather consecutive completed calls sharing the head's turn.
    let j = i + 1;
    while (j < run.length && run[j]!.status !== "running" && sameTurn(run[j]!, head)) j += 1;
    const group = run.slice(i, j);
    if (group.length >= 2) {
      out.push({ kind: "tool-cluster", id: `cluster_${group[0]!.id}_${group[group.length - 1]!.id}`, tools: group });
    } else {
      out.push({ kind: "tool", toolCall: group[0]! });
    }
    i = j;
  }

  const last = out[out.length - 1];
  if (isTail && last && last.kind === "tool-cluster") {
    const newest = last.tools[last.tools.length - 1]!;
    const rest = last.tools.slice(0, -1);
    if (rest.length >= 2) {
      out[out.length - 1] = { kind: "tool-cluster", id: `cluster_${rest[0]!.id}_${rest[rest.length - 1]!.id}`, tools: rest };
    } else {
      out[out.length - 1] = { kind: "tool", toolCall: rest[0]! };
    }
    out.push({ kind: "tool", toolCall: newest });
  }
  return out;
}

/**
 * Lay the merged timeline out into renderable rows, inserting day dividers at
 * calendar-day boundaries (including before the first row) and flagging grouped
 * message continuations.
 */
export function layoutTimeline(items: ChatItem[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let prevDay: string | null = null;
  /** The immediately-preceding message row, reset by dividers, system + tool rows. */
  let prevMessage: ChatMessage | null = null;
  /** Consecutive tool calls buffered so a completed same-turn run can cluster. */
  let pendingTools: ToolCall[] = [];

  /** Emit any buffered tool run; `isTail` when nothing follows it in the feed. */
  function flushTools(isTail: boolean): void {
    if (pendingTools.length === 0) return;
    for (const r of layoutToolRun(pendingTools, isTail)) rows.push(r);
    pendingTools = [];
    prevMessage = null; // a tool run breaks a message group, like a system line
  }

  for (const item of items) {
    const at =
      item.kind === "message" ? item.message.at : item.kind === "tool" ? item.toolCall.at : item.event.at;
    const day = dayKey(at);

    if (day !== prevDay) {
      // A day boundary breaks the tool run (its members can't span days).
      flushTools(false);
      rows.push({ kind: "day-divider", id: `day_${day}`, at });
      prevDay = day;
      prevMessage = null;
    }

    if (item.kind === "tool") {
      pendingTools.push(item.toolCall);
      continue;
    }

    flushTools(false);
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

  flushTools(true);
  return rows;
}
