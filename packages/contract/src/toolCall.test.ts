import { describe, expect, it } from "vitest";
import {
  firstToolCallCapExceeded,
  TOOL_ARGS_SUMMARY_MAX_BYTES,
  TOOL_RESULT_TAIL_MAX_BYTES,
  toolCallIdSchema,
  toolCallUpsertSchema,
} from "./toolCall";

describe("toolCallUpsertSchema", () => {
  it("accepts a minimal running receipt", () => {
    const parsed = toolCallUpsertSchema.safeParse({ tool: "bash", status: "running" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(toolCallUpsertSchema.safeParse({ tool: "bash", status: "done" }).success).toBe(false);
  });

  it("rejects finished_at before started_at", () => {
    const parsed = toolCallUpsertSchema.safeParse({ tool: "bash", status: "ok", started_at: 200, finished_at: 100 });
    expect(parsed.success).toBe(false);
  });

  it("allows finished_at without started_at (completed-only receipt)", () => {
    expect(toolCallUpsertSchema.safeParse({ tool: "bash", status: "ok", finished_at: 100 }).success).toBe(true);
  });
});

describe("toolCallIdSchema", () => {
  it("accepts a url-safe id and rejects one with a slash", () => {
    expect(toolCallIdSchema.safeParse("tc_1.a:b-c").success).toBe(true);
    expect(toolCallIdSchema.safeParse("tc/1").success).toBe(false);
  });
});

describe("firstToolCallCapExceeded", () => {
  it("returns null when every field is within its byte cap", () => {
    expect(firstToolCallCapExceeded({ args_summary: "a".repeat(TOOL_ARGS_SUMMARY_MAX_BYTES) })).toBeNull();
  });

  it("names the first cap exceeded with the actual byte size", () => {
    const over = firstToolCallCapExceeded({ result_tail: "x".repeat(TOOL_RESULT_TAIL_MAX_BYTES + 5) });
    expect(over?.limit).toBe("TOOL_RESULT_TAIL_MAX_BYTES");
    expect(over?.actual).toBe(TOOL_RESULT_TAIL_MAX_BYTES + 5);
  });

  it("measures UTF-8 bytes, not chars (a multibyte summary can exceed the cap)", () => {
    // "😀" is 4 UTF-8 bytes; enough of them exceeds the 500-byte args cap well under
    // 500 chars.
    const emoji = "😀".repeat(200); // 800 bytes, 400 code points
    const over = firstToolCallCapExceeded({ args_summary: emoji });
    expect(over?.limit).toBe("TOOL_ARGS_SUMMARY_MAX_BYTES");
    expect(over?.actual).toBeGreaterThan(TOOL_ARGS_SUMMARY_MAX_BYTES);
  });
});
