import { describe, expect, it } from "vitest";
import { GROUP_WINDOW_MS, layoutTimeline } from "./grouping";
import type { ChatItem, ChatMessage, SystemEvent, ToolCall } from "./types";

function tool(
  id: string,
  at: number,
  opts: { status?: ToolCall["status"]; turnId?: string } = {},
): ChatItem {
  const toolCall: ToolCall = {
    id,
    tool: "t",
    status: opts.status ?? "ok",
    turnId: opts.turnId,
    at,
    updatedAt: at,
  };
  return { kind: "tool", toolCall };
}

/** Base instant used across cases (a single local day unless offset). */
const DAY = new Date(2026, 6, 13, 9, 0, 0, 0).getTime();

function msg(id: string, role: "human" | "agent", at: number): ChatItem {
  const message: ChatMessage = { id, role, body: id, status: "complete", attachments: [], at };
  return { kind: "message", message };
}

function evt(id: string, at: number): ChatItem {
  const event: SystemEvent = {
    id,
    kind: "artifact_updated",
    actor: "agent",
    refs: {},
    at,
    summary: id,
  };
  return { kind: "system", event };
}

/** Message rows only, as [id, grouped] pairs. */
function messageRows(items: ChatItem[]) {
  return layoutTimeline(items)
    .filter((r) => r.kind === "message")
    .map((r) => (r.kind === "message" ? [r.message.id, r.grouped] : null));
}

describe("layoutTimeline", () => {
  it("inserts a day divider before the first row", () => {
    const rows = layoutTimeline([msg("m1", "human", DAY)]);
    expect(rows[0]?.kind).toBe("day-divider");
    expect(rows[1]?.kind).toBe("message");
  });

  it("groups consecutive same-author messages within the window", () => {
    const rows = messageRows([
      msg("m1", "human", DAY),
      msg("m2", "human", DAY + 60_000),
      msg("m3", "human", DAY + 120_000),
    ]);
    expect(rows).toEqual([
      ["m1", false],
      ["m2", true],
      ["m3", true],
    ]);
  });

  it("breaks a group when the author changes", () => {
    const rows = messageRows([
      msg("m1", "human", DAY),
      msg("m2", "agent", DAY + 1_000),
    ]);
    expect(rows).toEqual([
      ["m1", false],
      ["m2", false],
    ]);
  });

  it("breaks a group when the gap exceeds the window", () => {
    const rows = messageRows([
      msg("m1", "human", DAY),
      msg("m2", "human", DAY + GROUP_WINDOW_MS + 1),
    ]);
    expect(rows).toEqual([
      ["m1", false],
      ["m2", false],
    ]);
  });

  it("a system line breaks a group", () => {
    const rows = messageRows([
      msg("m1", "human", DAY),
      evt("e1", DAY + 1_000),
      msg("m2", "human", DAY + 2_000),
    ]);
    expect(rows).toEqual([
      ["m1", false],
      ["m2", false],
    ]);
  });

  it("a day boundary inserts a divider and breaks the group", () => {
    const nextDay = DAY + 24 * 60 * 60 * 1000;
    const rows = layoutTimeline([msg("m1", "human", DAY), msg("m2", "human", nextDay)]);
    const kinds = rows.map((r) => r.kind);
    // divider, m1, divider, m2
    expect(kinds).toEqual(["day-divider", "message", "day-divider", "message"]);
    const m2 = rows[3];
    expect(m2?.kind).toBe("message");
    expect(m2 && m2.kind === "message" ? m2.grouped : null).toBe(false);
  });

  it("a tool run breaks a message group", () => {
    const rows = messageRows([
      msg("m1", "human", DAY),
      tool("t1", DAY + 1_000),
      msg("m2", "human", DAY + 2_000),
    ]);
    expect(rows).toEqual([
      ["m1", false],
      ["m2", false],
    ]);
  });
});

describe("layoutTimeline — tool clustering (anti-noise)", () => {
  it("clusters consecutive completed same-turn calls, keeping the newest visible at the tail", () => {
    const rows = layoutTimeline([
      msg("m1", "human", DAY),
      tool("t1", DAY + 1_000, { turnId: "A" }),
      tool("t2", DAY + 2_000, { turnId: "A" }),
      tool("t3", DAY + 3_000, { turnId: "A" }),
    ]);
    const kinds = rows.map((r) => r.kind);
    // divider, message, cluster(t1,t2), tool(t3 — most recent stays visible)
    expect(kinds).toEqual(["day-divider", "message", "tool-cluster", "tool"]);
    const cluster = rows[2];
    expect(cluster?.kind === "tool-cluster" && cluster.tools.map((t) => t.id)).toEqual(["t1", "t2"]);
    const tail = rows[3];
    expect(tail?.kind === "tool" && tail.toolCall.id).toBe("t3");
  });

  it("collapses a whole completed run into one cluster when it is NOT the tail", () => {
    const rows = layoutTimeline([
      tool("t1", DAY + 1_000, { turnId: "A" }),
      tool("t2", DAY + 2_000, { turnId: "A" }),
      tool("t3", DAY + 3_000, { turnId: "A" }),
      msg("m1", "human", DAY + 4_000),
    ]);
    const cluster = rows.find((r) => r.kind === "tool-cluster");
    expect(cluster?.kind === "tool-cluster" && cluster.tools.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("keeps a running call as its own visible row (never inside a cluster)", () => {
    const rows = layoutTimeline([
      tool("t1", DAY + 1_000, { turnId: "A" }),
      tool("t2", DAY + 2_000, { turnId: "A" }),
      tool("t3", DAY + 3_000, { turnId: "A", status: "running" }),
    ]);
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toEqual(["day-divider", "tool-cluster", "tool"]);
    const running = rows[2];
    expect(running?.kind === "tool" && running.toolCall.status).toBe("running");
  });

  it("does not cluster calls from different turns", () => {
    const rows = layoutTimeline([
      tool("t1", DAY + 1_000, { turnId: "A" }),
      tool("t2", DAY + 2_000, { turnId: "B" }),
    ]);
    expect(rows.map((r) => r.kind)).toEqual(["day-divider", "tool", "tool"]);
  });
});
