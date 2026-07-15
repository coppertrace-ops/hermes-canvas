import { describe, expect, it } from "vitest";
import { describeToolStatus, formatToolDuration, isSubagentCall, majoritySession } from "./toolCalls";
import type { ChatItem, ToolCall } from "./types";

function tool(id: string, sessionId?: string, status: ToolCall["status"] = "ok"): ChatItem {
  return {
    kind: "tool",
    toolCall: { id, tool: "t", status, sessionId, at: 1, updatedAt: 1 },
  };
}

describe("describeToolStatus", () => {
  it("maps each state to a tone + label", () => {
    expect(describeToolStatus("running").tone).toBe("neutral");
    expect(describeToolStatus("ok").tone).toBe("success");
    expect(describeToolStatus("error").tone).toBe("danger");
    expect(describeToolStatus("blocked").tone).toBe("warning");
  });
});

describe("formatToolDuration", () => {
  it("formats ms, seconds, and minutes; null when unknown", () => {
    expect(formatToolDuration(undefined)).toBeNull();
    expect(formatToolDuration(820)).toBe("820ms");
    expect(formatToolDuration(1400)).toBe("1.4s");
    expect(formatToolDuration(45_000)).toBe("45s");
    expect(formatToolDuration(123_000)).toBe("2m 3s");
  });
});

describe("majoritySession + isSubagentCall", () => {
  it("returns the plurality session and flags the odd one out as a subagent", () => {
    const items = [tool("a", "main"), tool("b", "main"), tool("c", "sub")];
    const maj = majoritySession(items);
    expect(maj).toBe("main");
    expect(isSubagentCall(items[2]!.kind === "tool" ? items[2]!.toolCall : ({} as ToolCall), maj)).toBe(true);
    expect(isSubagentCall(items[0]!.kind === "tool" ? items[0]!.toolCall : ({} as ToolCall), maj)).toBe(false);
  });

  it("is undefined on a tie (no clear majority) and then no chip shows", () => {
    const items = [tool("a", "x"), tool("b", "y")];
    const maj = majoritySession(items);
    expect(maj).toBeUndefined();
    expect(isSubagentCall(items[0]!.kind === "tool" ? items[0]!.toolCall : ({} as ToolCall), maj)).toBe(false);
  });

  it("ignores calls without a session id", () => {
    expect(majoritySession([tool("a"), tool("b", "main"), tool("c", "main")])).toBe("main");
  });
});
