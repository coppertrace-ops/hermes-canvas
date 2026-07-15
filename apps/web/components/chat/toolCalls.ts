/**
 * Tool-call presentation helpers (OWNER: COURIER) — PURE, DOM-free.
 *
 * The row/cluster components stay presentational by deriving their tone, label,
 * and the "subagent" attribution from these functions, which unit-test in
 * isolation. Nothing here reaches into React or the backend.
 */

import type { StatusTone } from "@hermes/ui";
import type { ChatItem, ToolCall, ToolCallStatus } from "./types";

/** Tone + short accessible label for a tool-call state. */
export interface ToolStatusMeta {
  tone: StatusTone;
  /** Screen-reader label announced on the terminal transition. */
  label: string;
}

export function describeToolStatus(status: ToolCallStatus): ToolStatusMeta {
  switch (status) {
    case "running":
      return { tone: "neutral", label: "Running" };
    case "ok":
      return { tone: "success", label: "Completed" };
    case "error":
      return { tone: "danger", label: "Failed" };
    case "blocked":
      return { tone: "warning", label: "Blocked" };
    default: {
      const _exhaustive: never = status;
      return { tone: "neutral", label: String(_exhaustive) };
    }
  }
}

/**
 * Compact human duration for a completed call, e.g. "820ms", "1.4s", "2m 3s".
 * Returns null when no duration is known (nothing to show).
 */
export function formatToolDuration(ms: number | undefined): string | null {
  if (ms === undefined || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s >= 10 ? Math.round(s) : s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

/**
 * The session id shared by the plurality of tool calls in the visible window, or
 * undefined when there are none / it's a tie with no clear majority. Client code
 * can't know the "main" session id, so the majority is the honest proxy: a
 * receipt whose session differs from it is attributed to a subagent.
 */
export function majoritySession(items: ChatItem[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== "tool") continue;
    const sid = item.toolCall.sessionId;
    if (sid === undefined) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  let tied = false;
  for (const [sid, n] of counts) {
    if (n > bestN) {
      best = sid;
      bestN = n;
      tied = false;
    } else if (n === bestN) {
      tied = true;
    }
  }
  return tied ? undefined : best;
}

/**
 * Whether a call should carry a "subagent" chip: it has a session id, a majority
 * session exists, and the two differ. Kept as a helper so the row and the tests
 * agree on the rule.
 */
export function isSubagentCall(toolCall: ToolCall, majoritySessionId: string | undefined): boolean {
  return (
    toolCall.sessionId !== undefined &&
    majoritySessionId !== undefined &&
    toolCall.sessionId !== majoritySessionId
  );
}
