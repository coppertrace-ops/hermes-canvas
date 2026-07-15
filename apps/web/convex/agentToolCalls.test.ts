/// <reference types="vite/client" />
import { TOOL_ARGS_SUMMARY_MAX_BYTES, TOOL_CALL_UPSERTS_PER_MIN, TOOL_RESULT_TAIL_MAX_BYTES } from "@hermes/contract";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

/**
 * Tool-call receipt ingest specs (OWNER: LEDGER). Proves: a start `running`
 * receipt then a terminal one update the SAME row in place (join by
 * tool_call_id, not adjacency); a completed-only post creates the finished row
 * directly; the byte caps are re-enforced server-side with a structured oversize
 * naming the cap; the dedicated upsert budget rejects a storm with 429; and the
 * owner read query is owner-gated. The anon-reject assertion requires the demo
 * bypass OFF, so the env is pinned independent of the ambient shell.
 */

const modules = import.meta.glob("./**/!(*.test).*s");
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };
const UNAUTHORIZED = /owner sign-in required/;
const TOKEN = "test-service-token";
const authHeaders = { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

function put(t: ReturnType<typeof convexTest>, id: string, body: unknown) {
  return t.fetch(`/agent/tool-calls/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DEMO_AUTH_BYPASS", "");
  vi.stubEnv("HERMES_SERVICE_TOKEN", TOKEN);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PUT /agent/tool-calls/:id", () => {
  it("rejects a missing/invalid service token", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/agent/tool-calls/tc_1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool: "bash", status: "running" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a malformed tool_call_id (not url-safe)", async () => {
    const t = convexTest(schema, modules);
    const res = await put(t, "bad%2Fslash", { tool: "bash", status: "running" });
    expect(res.status).toBe(404);
  });

  it("upserts running -> ok in place (join by tool_call_id) and derives duration", async () => {
    const t = convexTest(schema, modules);
    const start = await put(t, "tc_1", {
      tool: "canvas_read_artifact",
      status: "running",
      args_summary: "art_1",
      session_id: "sess_main",
      turn_id: "turn_a",
      started_at: 1000,
    });
    expect(start.status).toBe(200);
    expect((await start.json()).status).toBe("running");

    const done = await put(t, "tc_1", {
      tool: "canvas_read_artifact",
      status: "ok",
      result_tail: "# Design notes",
      finished_at: 1250,
    });
    expect(done.status).toBe(200);

    const rows = await t.run((ctx) => ctx.db.query("tool_calls").collect());
    expect(rows).toHaveLength(1); // updated in place, not stacked
    const row = rows[0]!;
    expect(row.status).toBe("ok");
    expect(row.args_summary).toBe("art_1"); // start's summary survives the completion
    expect(row.result_tail).toBe("# Design notes");
    expect(row.duration_ms).toBe(250); // derived from started_at/finished_at
  });

  it("creates the finished row directly from a completed-only post", async () => {
    const t = convexTest(schema, modules);
    const res = await put(t, "tc_solo", {
      tool: "web_search",
      status: "ok",
      started_at: 500,
      finished_at: 1900,
    });
    expect(res.status).toBe(200);
    const rows = await t.run((ctx) => ctx.db.query("tool_calls").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("ok");
    expect(rows[0]!.duration_ms).toBe(1400);
  });

  it("rejects an oversize args_summary with a structured oversize naming the cap", async () => {
    const t = convexTest(schema, modules);
    const res = await put(t, "tc_big", {
      tool: "bash",
      status: "ok",
      args_summary: "a".repeat(TOOL_ARGS_SUMMARY_MAX_BYTES + 1),
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe("oversize");
    expect(body.error.detail.limit).toBe("TOOL_ARGS_SUMMARY_MAX_BYTES");
    // Nothing was written — a rejected receipt never lands.
    const rows = await t.run((ctx) => ctx.db.query("tool_calls").collect());
    expect(rows).toHaveLength(0);
  });

  it("rejects an oversize result_tail naming its cap", async () => {
    const t = convexTest(schema, modules);
    const res = await put(t, "tc_big2", {
      tool: "bash",
      status: "ok",
      result_tail: "x".repeat(TOOL_RESULT_TAIL_MAX_BYTES + 1),
    });
    expect(res.status).toBe(413);
    expect((await res.json()).error.detail.limit).toBe("TOOL_RESULT_TAIL_MAX_BYTES");
  });

  it("rejects a receipt storm past the dedicated upsert budget (429)", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.run(async (ctx) => {
      for (let i = 0; i < TOOL_CALL_UPSERTS_PER_MIN; i++) {
        await ctx.db.insert("tool_calls", { tool_call_id: `seed_${i}`, tool: "t", status: "ok", updated_at: now });
      }
    });
    const res = await put(t, "tc_over", { tool: "bash", status: "running" });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.detail.scope).toBe("tool_calls");
  });
});

describe("canvas.listRecentToolCalls", () => {
  it("returns receipts oldest->newest for the owner", async () => {
    const t = convexTest(schema, modules);
    await put(t, "tc_a", { tool: "a", status: "ok", started_at: 100, finished_at: 150 });
    await put(t, "tc_b", { tool: "b", status: "running", started_at: 200 });
    const rows = await t.withIdentity(OWNER).query(api.canvas.listRecentToolCalls, {});
    expect(rows.map((r) => r.tool_call_id)).toEqual(["tc_a", "tc_b"]);
    expect(rows[1]!.status).toBe("running");
  });

  it("rejects an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.canvas.listRecentToolCalls, {})).rejects.toThrow(UNAUTHORIZED);
  });
});
