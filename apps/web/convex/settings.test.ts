/// <reference types="vite/client" />
import { AGENT_STATUS_BODY_MAX_BYTES, LIMITS } from "@hermes/contract";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Settings surface specs (OWNER: LEDGER). Covers the two service-token infra
 * writes (`PUT /agent/status`, `PUT /agent/memory`) and the three owner-guarded
 * read queries. Proves: status validates + upserts a singleton + server-stamps
 * reported_at; memory bulk sync upserts, full-replaces, and caps; every query is
 * owner-gated (anon rejected). The anon-reject assertions require the demo bypass
 * OFF, so the env is pinned independent of the ambient shell.
 */

const modules = import.meta.glob("./**/!(*.test).*s");
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };
const UNAUTHORIZED = /owner sign-in required/;
const TOKEN = "test-service-token";
const authHeaders = { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DEMO_AUTH_BYPASS", "");
  vi.stubEnv("HERMES_SERVICE_TOKEN", TOKEN);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PUT /agent/status", () => {
  it("rejects a missing/invalid service token", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/agent/status", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "m", provider: "p" }),
    });
    expect(res.status).toBe(401);
  });

  it("validates the body (model + provider required)", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/agent/status", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ provider: "p" }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects an oversize body with a structured oversize error naming the cap", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/agent/status", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ model: "m", provider: "p", effort: "x".repeat(AGENT_STATUS_BODY_MAX_BYTES) }),
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe("oversize");
    expect(body.error.detail.limit).toBe("AGENT_STATUS_BODY_MAX_BYTES");
  });

  it("upserts a singleton and server-stamps reported_at", async () => {
    const t = convexTest(schema, modules);
    const before = Date.now();
    const res = await t.fetch("/agent/status", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ model: "claude-fable-5", provider: "anthropic", effort: "high" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reported_at).toBeGreaterThanOrEqual(before);

    // A second report replaces the row — still a single row.
    await t.fetch("/agent/status", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ model: "claude-opus-4-8", provider: "anthropic" }),
    });
    const rows = await t.run((ctx) => ctx.db.query("agent_status").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.model).toBe("claude-opus-4-8");
    expect(typeof rows[0]!.reported_at).toBe("number");
  });
});

describe("settings.getAgentStatus", () => {
  it("returns null before any report, then the row after", async () => {
    const t = convexTest(schema, modules);
    expect(await t.withIdentity(OWNER).query(api.settings.getAgentStatus, {})).toBeNull();
    await t.mutation(internal.agentInfra.upsertAgentStatus, { model: "m", provider: "p", toolsets: ["canvas"] });
    const status = await t.withIdentity(OWNER).query(api.settings.getAgentStatus, {});
    expect(status?.model).toBe("m");
    expect(status?.toolsets).toEqual(["canvas"]);
    expect(typeof status?.reported_at).toBe("number");
  });

  it("rejects an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.settings.getAgentStatus, {})).rejects.toThrow(UNAUTHORIZED);
  });
});

describe("PUT /agent/memory + settings.listMemories", () => {
  it("upserts entries by entry_id and lists them newest-updated first", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/agent/memory", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        entries: [
          { entry_id: "e1", content: "alpha", updated_at: 100 },
          { entry_id: "e2", content: "beta", tags: ["rf"], updated_at: 300 },
          { entry_id: "e3", content: "gamma", updated_at: 200 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).upserted).toBe(3);

    const list = await t.withIdentity(OWNER).query(api.settings.listMemories, {});
    expect(list.map((m) => m.entry_id)).toEqual(["e2", "e3", "e1"]);

    // Re-sync e1 with new content — upsert, not duplicate.
    await t.fetch("/agent/memory", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ entries: [{ entry_id: "e1", content: "alpha-2", updated_at: 400 }] }),
    });
    const rows = await t.run((ctx) => ctx.db.query("memories").collect());
    expect(rows).toHaveLength(3);
    const list2 = await t.withIdentity(OWNER).query(api.settings.listMemories, {});
    expect(list2[0]!.entry_id).toBe("e1");
    expect(list2[0]!.content).toBe("alpha-2");
  });

  it("full:true removes rows the payload omits (mirror semantics)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.agentInfra.syncMemories, {
      entries: [
        { entry_id: "keep", content: "k" },
        { entry_id: "drop", content: "d" },
      ],
    });
    const out = await t.mutation(internal.agentInfra.syncMemories, {
      entries: [{ entry_id: "keep", content: "k2" }],
      full: true,
    });
    expect(out.deleted).toBe(1);
    const rows = await t.run((ctx) => ctx.db.query("memories").collect());
    expect(rows.map((r) => r.entry_id)).toEqual(["keep"]);
  });

  it("search is a case-insensitive substring over content + tags; limit bounds the result", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.agentInfra.syncMemories, {
      entries: [
        { entry_id: "a", content: "Antenna gain notes", updated_at: 1 },
        { entry_id: "b", content: "unrelated", tags: ["ANTENNA"], updated_at: 2 },
        { entry_id: "c", content: "nothing here", updated_at: 3 },
      ],
    });
    const hits = await t.withIdentity(OWNER).query(api.settings.listMemories, { search: "antenna" });
    expect(hits.map((m) => m.entry_id).sort()).toEqual(["a", "b"]);

    const limited = await t.withIdentity(OWNER).query(api.settings.listMemories, { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("caps at MEMORY_SYNC_MAX_ENTRIES entries per request (422)", async () => {
    const t = convexTest(schema, modules);
    const entries = Array.from({ length: 501 }, (_, i) => ({ entry_id: `e${i}`, content: "x" }));
    const res = await t.fetch("/agent/memory", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ entries }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects an anonymous caller on listMemories", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.settings.listMemories, {})).rejects.toThrow(UNAUTHORIZED);
  });
});

describe("settings.getWorkspaceInfo", () => {
  it("returns the contract LIMITS for the owner", async () => {
    const t = convexTest(schema, modules);
    const info = await t.withIdentity(OWNER).query(api.settings.getWorkspaceInfo, {});
    expect(info.limits).toEqual(LIMITS);
    expect(info.deployment).toHaveProperty("convex_url");
  });

  it("rejects an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.settings.getWorkspaceInfo, {})).rejects.toThrow(UNAUTHORIZED);
  });
});
