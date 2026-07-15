import { describe, expect, it } from "vitest";
import {
  AGENT_STATUS_BODY_MAX_BYTES,
  agentStatusSchema,
  MEMORY_ENTRY_CONTENT_MAX_BYTES,
  MEMORY_SYNC_MAX_ENTRIES,
  memorySyncSchema,
} from "./status";

/**
 * Wire-shape specs for the Settings infra endpoints. The zod schemas are the
 * single source of truth for `PUT /agent/status` and `PUT /agent/memory`, so
 * these pin the required fields, the caps, and the forward-compat stripping of
 * unknown keys.
 */

describe("agentStatusSchema", () => {
  it("accepts a minimal {model, provider} report", () => {
    const parsed = agentStatusSchema.parse({ model: "claude-fable-5", provider: "anthropic" });
    expect(parsed.model).toBe("claude-fable-5");
    expect(parsed.provider).toBe("anthropic");
  });

  it("accepts the full nested shape", () => {
    const parsed = agentStatusSchema.parse({
      model: "m",
      provider: "p",
      effort: "high",
      fallbacks: ["a", "b"],
      context: { used_tokens: 10, max_tokens: 200_000 },
      gateway: { version: "1.2.3", uptime_s: 42 },
      toolsets: ["canvas"],
      platforms: ["droplet"],
      sessions_active: 3,
      memory: { provider: "sqlite", recall_budget: 5 },
    });
    expect(parsed.context?.max_tokens).toBe(200_000);
    expect(parsed.gateway?.version).toBe("1.2.3");
  });

  it("rejects a body missing model or provider", () => {
    expect(agentStatusSchema.safeParse({ provider: "p" }).success).toBe(false);
    expect(agentStatusSchema.safeParse({ model: "m" }).success).toBe(false);
  });

  it("strips unknown keys (forward-compat with a newer gateway)", () => {
    const parsed = agentStatusSchema.parse({ model: "m", provider: "p", brand_new_field: 1 });
    expect("brand_new_field" in parsed).toBe(false);
  });

  it("the body cap is a small, positive byte budget", () => {
    expect(AGENT_STATUS_BODY_MAX_BYTES).toBe(16 * 1024);
  });
});

describe("memorySyncSchema", () => {
  it("accepts entries and an optional full flag", () => {
    const parsed = memorySyncSchema.parse({
      entries: [{ entry_id: "e1", content: "hello", tags: ["t"], source: "host", created_at: 1, updated_at: 2 }],
      full: true,
    });
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.full).toBe(true);
  });

  it("requires entry_id and content on each entry", () => {
    expect(memorySyncSchema.safeParse({ entries: [{ content: "x" }] }).success).toBe(false);
    expect(memorySyncSchema.safeParse({ entries: [{ entry_id: "e" }] }).success).toBe(false);
  });

  it("rejects more than the entry cap", () => {
    const entries = Array.from({ length: MEMORY_SYNC_MAX_ENTRIES + 1 }, (_, i) => ({
      entry_id: `e${i}`,
      content: "x",
    }));
    expect(memorySyncSchema.safeParse({ entries }).success).toBe(false);
  });

  it("rejects an entry whose content exceeds the byte cap", () => {
    const tooBig = "a".repeat(MEMORY_ENTRY_CONTENT_MAX_BYTES + 1);
    expect(memorySyncSchema.safeParse({ entries: [{ entry_id: "e", content: tooBig }] }).success).toBe(false);
  });

  it("measures content in UTF-8 bytes, not code points", () => {
    // A 4-byte emoji: fits under the cap by char count but is measured on bytes.
    const emoji = "😀".repeat(MEMORY_ENTRY_CONTENT_MAX_BYTES / 4);
    const ok = memorySyncSchema.safeParse({ entries: [{ entry_id: "e", content: emoji }] });
    expect(ok.success).toBe(true);
    const over = memorySyncSchema.safeParse({
      entries: [{ entry_id: "e", content: emoji + "😀" }],
    });
    expect(over.success).toBe(false);
  });
});
