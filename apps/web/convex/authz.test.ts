/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Owner-authorization surface tests (OWNER: WARDEN, plan §6).
 *
 * The auth implementation created `requireOwner` but did not apply it to the
 * browser-only writes. This suite proves the applied boundary end-to-end against a
 * real in-memory Convex backend:
 *
 *   1. ANONYMOUS / non-owner browser writes REJECT — every browser-only mutation
 *      (`human.sendMessage`, `canvas.restoreArtifact`, `lastSeen.markSeen`,
 *      `metrics.recordEvent`) throws before it can touch the database.
 *   2. The signed-in OWNER succeeds — the same calls carrying an identity resolve.
 *      (Convex Auth's allowlist-of-one means a present identity IS the owner; the
 *      guard's job is to require that an identity exists at all.)
 *   3. The AGENT internal path stays usable — the `internal.agentWrites.*`
 *      mutations and the dual-use read queries the `/agent/*` HTTP layer reaches via
 *      `ctx.runQuery` are NOT owner-guarded (no user identity exists on the
 *      service-token path), so they still run un-authenticated.
 *
 * The anonymous-reject assertions depend on the demo bypass being OFF; we pin the
 * env so the result is independent of the ambient shell (the bypass is honored only
 * in non-production with an explicit `DEMO_AUTH_BYPASS=true`, and never here).
 */

const modules = import.meta.glob("./**/!(*.test).*s");

/** A signed-in identity. Convex Auth already enforced allowlist-of-one at sign-in. */
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };

/** Matches the guard's failure message across every guarded mutation. */
const UNAUTHORIZED = /owner sign-in required/;

beforeEach(() => {
  // Force the demo bypass off so an un-authenticated call is genuinely rejected,
  // regardless of how the surrounding CI/shell set NODE_ENV / DEMO_AUTH_BYPASS.
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DEMO_AUTH_BYPASS", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** Seed one artifact through the AGENT internal path (no owner guard) for restore tests. */
async function seedArtifact(t: ReturnType<typeof convexTest>) {
  const created = await t.mutation(internal.agentWrites.createArtifact, {
    type: "markdown",
    title: "Seed",
    content: "hello",
    why: "seed for authz test",
  });
  if (!created.ok) throw new Error("seed failed");
  return created.result.artifact_id;
}

describe("browser-only writes reject an anonymous / non-owner caller", () => {
  it("human.sendMessage throws unauthorized and writes nothing", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.human.sendMessage, { text: "hi" })).rejects.toThrow(UNAUTHORIZED);
    const messages = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(messages).toHaveLength(0);
  });

  it("canvas.restoreArtifact throws unauthorized", async () => {
    const t = convexTest(schema, modules);
    const artifactId = await seedArtifact(t);
    await expect(
      t.mutation(api.canvas.restoreArtifact, { artifact_id: artifactId, seq: 1, why: "revert" }),
    ).rejects.toThrow(UNAUTHORIZED);
  });

  it("lastSeen.markSeen throws unauthorized and advances no cursor", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lastSeen.markSeen, { artifact_id: "art_1", seq: 3 }),
    ).rejects.toThrow(UNAUTHORIZED);
    const rows = await t.run((ctx) => ctx.db.query("last_seen").collect());
    expect(rows).toHaveLength(0);
  });

  it("metrics.recordEvent throws unauthorized and records nothing", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.metrics.recordEvent, { kind: "diff_opened", artifact_id: "art_1" }),
    ).rejects.toThrow(UNAUTHORIZED);
    const rows = await t.run((ctx) => ctx.db.query("metrics").collect());
    expect(rows).toHaveLength(0);
  });
});

describe("the signed-in owner is permitted through every browser-only write", () => {
  it("human.sendMessage persists the message", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const res = await t.mutation(api.human.sendMessage, { text: "owner speaking" });
    expect(res.ok).toBe(true);
  });

  it("canvas.restoreArtifact is allowed to run its plan", async () => {
    const t = convexTest(schema, modules);
    const artifactId = await seedArtifact(t); // seed via agent path
    const asOwner = t.withIdentity(OWNER);
    const res = await asOwner.mutation(api.canvas.restoreArtifact, {
      artifact_id: artifactId,
      seq: 1,
      why: "revert to v1",
    });
    // The guard passed (no throw); the append-only plan succeeds for this fresh chain.
    expect(res.ok).toBe(true);
  });

  it("lastSeen.markSeen advances the owner's cursor", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const res = await t.mutation(api.lastSeen.markSeen, { artifact_id: "art_1", seq: 0 });
    expect(res.artifact_id).toBe("art_1");
  });

  it("metrics.recordEvent records the event", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const res = await t.mutation(api.metrics.recordEvent, {
      kind: "diff_opened",
      artifact_id: "art_1",
    });
    expect(res.recorded).toBe(true);
  });
});

describe("the agent service-token path is unaffected by the owner guard", () => {
  it("internal agentWrites.postMessage still runs un-authenticated", async () => {
    const t = convexTest(schema, modules); // no identity — mirrors the /agent/* runMutation
    const res = await t.mutation(internal.agentWrites.postMessage, {
      text: "agent reply",
      role: "agent",
    });
    expect(res.ok).toBe(true);
  });

  it("internal agentWrites.createArtifact still runs un-authenticated", async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(internal.agentWrites.createArtifact, {
      type: "markdown",
      title: "Agent doc",
      content: "body",
      why: "agent create",
    });
    expect(res.ok).toBe(true);
  });

  it("dual-use read queries the /agent/* layer reaches stay open (no user identity)", async () => {
    const t = convexTest(schema, modules);
    await seedArtifact(t);
    // These are exactly what http.ts calls via ctx.runQuery on the service-token path.
    const pending = await t.query(api.canvas.pendingWork, { cursor: 0 });
    expect(Array.isArray(pending.messages)).toBe(true);
    const artifacts = await t.query(api.canvas.listArtifacts, {});
    expect(artifacts.length).toBe(1);
  });
});
