/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

/**
 * Feature-flag subsystem tests (Wave 2, spec §1; OWNER: LEDGER).
 *
 * Proves the four acceptance criteria against a real in-memory Convex backend:
 *   1. Default OFF — an absent `flags` row reads as `false`.
 *   2. Owner-only flip — an anonymous caller (which includes the identity-less
 *      `/agent/*` service path) is rejected before touching the DB; the signed-in
 *      owner succeeds.
 *   3. Atomic audit — a flip writes exactly one `flag_changed` event in the same
 *      mutation, carrying `{flag_key, enabled}` with actor `human`.
 *   4. Closed key set — an unknown key is rejected and nothing is written.
 *
 * The anonymous-reject assertions require the demo bypass OFF; we pin the env so
 * the result is independent of the ambient shell.
 */

const modules = import.meta.glob("./**/!(*.test).*s");

const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };
const UNAUTHORIZED = /owner sign-in required/;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DEMO_AUTH_BYPASS", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getFlags — default OFF", () => {
  it("reads every flag as off when no rows exist (absent row = off)", async () => {
    const t = convexTest(schema, modules);
    const flags = await t.query(api.flags.getFlags, {});
    expect(flags).toEqual({ html_artifacts: false, boards: false, jobs_tab: false });
  });
});

describe("setFlag — owner-only", () => {
  it("rejects an anonymous / agent-path caller and writes nothing", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.flags.setFlag, { key: "html_artifacts", enabled: true }),
    ).rejects.toThrow(UNAUTHORIZED);
    const rows = await t.run((ctx) => ctx.db.query("flags").collect());
    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(rows).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("lets the signed-in owner enable a flag, and getFlags reflects it", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    await t.mutation(api.flags.setFlag, { key: "boards", enabled: true });
    const flags = await t.query(api.flags.getFlags, {});
    expect(flags).toEqual({ html_artifacts: false, boards: true, jobs_tab: false });
  });
});

describe("setFlag — atomic audit event", () => {
  it("writes exactly one flag_changed event carrying {flag_key, enabled} as human", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    await t.mutation(api.flags.setFlag, { key: "jobs_tab", enabled: true });

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events).toHaveLength(1);
    const [e] = events;
    if (!e) throw new Error("expected one flag_changed event");
    expect(e.kind).toBe("flag_changed");
    expect(e.actor).toBe("human");
    expect(e.refs.flag_key).toBe("jobs_tab");
    expect(e.refs.enabled).toBe(true);
    expect(typeof e.seq).toBe("number");
  });

  it("upserts (never duplicates) a row and audits each flip when toggled off", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    await t.mutation(api.flags.setFlag, { key: "html_artifacts", enabled: true });
    await t.mutation(api.flags.setFlag, { key: "html_artifacts", enabled: false });

    const rows = await t.run((ctx) => ctx.db.query("flags").collect());
    expect(rows).toHaveLength(1); // upsert, not insert-twice
    const [row] = rows;
    if (!row) throw new Error("expected one flags row");
    expect(row.enabled).toBe(false);

    const flags = await t.query(api.flags.getFlags, {});
    expect(flags.html_artifacts).toBe(false);

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.refs.enabled)).toEqual([true, false]);
  });
});

describe("setFlag — closed key set", () => {
  it("rejects an unknown key and writes nothing", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    await expect(
      t.mutation(api.flags.setFlag, { key: "not_a_real_flag", enabled: true }),
    ).rejects.toThrow(/unknown flag key/);
    const rows = await t.run((ctx) => ctx.db.query("flags").collect());
    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(rows).toHaveLength(0);
    expect(events).toHaveLength(0);
  });
});
