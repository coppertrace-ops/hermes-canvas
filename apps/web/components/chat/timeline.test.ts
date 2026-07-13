import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import type { ChatMessage, SystemEvent } from "./types";

const msg = (id: string, at: number): ChatMessage => ({
  id,
  role: "human",
  body: id,
  status: "complete",
  attachments: [],
  at,
});

const evt = (id: string, at: number): SystemEvent => ({
  id,
  kind: "artifact_updated",
  actor: "agent",
  refs: {},
  at,
  summary: id,
});

describe("buildTimeline", () => {
  it("interleaves messages and events in ascending time order", () => {
    const items = buildTimeline([msg("m1", 100), msg("m2", 300)], [evt("e1", 200)]);
    expect(items.map((i) => (i.kind === "message" ? i.message.id : i.event.id))).toEqual([
      "m1",
      "e1",
      "m2",
    ]);
  });

  it("is deterministic regardless of input order (reconnect resync safety)", () => {
    const a = buildTimeline([msg("m2", 300), msg("m1", 100)], [evt("e1", 200)]);
    const b = buildTimeline([msg("m1", 100), msg("m2", 300)], [evt("e1", 200)]);
    expect(a).toEqual(b);
  });

  it("sorts a same-instant system line before a message", () => {
    const items = buildTimeline([msg("m1", 500)], [evt("e1", 500)]);
    expect(items[0]?.kind).toBe("system");
    expect(items[1]?.kind).toBe("message");
  });

  it("returns an empty array for empty inputs", () => {
    expect(buildTimeline([], [])).toEqual([]);
  });

  it("does not mutate the input arrays", () => {
    const messages = [msg("m2", 2), msg("m1", 1)];
    const before = [...messages];
    buildTimeline(messages, []);
    expect(messages).toEqual(before);
  });
});
