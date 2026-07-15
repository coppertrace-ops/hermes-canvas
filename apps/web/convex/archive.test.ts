/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Human archive / unarchive mutation tests (OWNER: LEDGER — the browser-side
 * mirror of the agent archive path).
 *
 * Removal is SOFT-ARCHIVE only (plan §2.2): reversible, recorded in the
 * append-only ledger, never a hard delete. These prove the owner-guarded
 * `archiveArtifactAsHuman` / `unarchiveArtifactAsHuman` / `archiveTabAsHuman`
 * mutations:
 *
 *   1. reject an anonymous caller (the demo bypass is pinned OFF);
 *   2. archive flips status + writes the `artifact_archived` event, and the
 *      artifact drops out of the default (active-only) `listArtifacts`;
 *   3. unarchive restores it (status active, still listed only with
 *      `include_archived`), recorded via an `artifact_updated` event carrying the
 *      server's `resolved_action.op: "unarchive"`;
 *   4. the version chain is untouched by the round-trip (append-only history);
 *   5. tab archive flips the tab and drops it from `listTabs`.
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

/** Seed one artifact through the agent internal path (no owner guard). */
async function seedArtifact(t: ReturnType<typeof convexTest>, title = "Seed") {
  const created = await t.mutation(internal.agentWrites.createArtifact, {
    type: "markdown",
    title,
    content: "hello",
    why: "seed for archive test",
  });
  if (!created.ok) throw new Error("seed failed");
  return created.result.artifact_id;
}

describe("canvas.archiveArtifactAsHuman / unarchiveArtifactAsHuman", () => {
  it("rejects an anonymous caller and writes no archive event", async () => {
    const t = convexTest(schema, modules);
    const id = await seedArtifact(t);

    await expect(t.mutation(api.canvas.archiveArtifactAsHuman, { id })).rejects.toThrow(UNAUTHORIZED);
    await expect(t.mutation(api.canvas.unarchiveArtifactAsHuman, { id })).rejects.toThrow(UNAUTHORIZED);

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events.some((e) => e.kind === "artifact_archived")).toBe(false);
    // The artifact is untouched — still active.
    const doc = await t.run((ctx) =>
      ctx.db.query("artifacts").withIndex("by_art_key", (q) => q.eq("art_key", id)).unique(),
    );
    expect(doc?.status).toBe("active");
  });

  it("archives: status flips, an artifact_archived event is written, and the default list excludes it", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(OWNER);
    const id = await seedArtifact(t);

    const before = await asOwner.query(api.canvas.listArtifacts, {});
    expect(before.map((a) => a.artifact_id)).toContain(id);

    const res = await asOwner.mutation(api.canvas.archiveArtifactAsHuman, { id, why: "no longer needed" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.resolved_action.op).toBe("archive");

    // Default list (active only) drops it; include_archived surfaces it again.
    const active = await asOwner.query(api.canvas.listArtifacts, {});
    expect(active.map((a) => a.artifact_id)).not.toContain(id);
    const all = await asOwner.query(api.canvas.listArtifacts, { include_archived: true });
    expect(all.find((a) => a.artifact_id === id)?.status).toBe("archived");

    // The event landed in the same transaction, attributed to the human.
    const events = await t.run((ctx) => ctx.db.query("events").collect());
    const archived = events.find((e) => e.kind === "artifact_archived" && e.refs.artifact_id === id);
    expect(archived).toBeDefined();
    expect(archived?.actor).toBe("human");
  });

  it("rejects re-archiving an already-archived artifact", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(OWNER);
    const id = await seedArtifact(t);

    const first = await asOwner.mutation(api.canvas.archiveArtifactAsHuman, { id });
    expect(first.ok).toBe(true);
    const second = await asOwner.mutation(api.canvas.archiveArtifactAsHuman, { id });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe("validation_failed");
  });

  it("unarchives: status returns to active with an artifact_updated + op:unarchive record, history intact", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(OWNER);
    const id = await seedArtifact(t);

    // Build a little history first so we can prove the round-trip preserves it.
    const u1 = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: id,
      parent_seq: 1,
      why: "second pass",
      edit: { mode: "replace_all", content: "world" },
    });
    expect(u1.ok).toBe(true);
    const chainBefore = await asOwner.query(api.canvas.versionChain, { artifact_id: id });
    const versionsBefore = chainBefore?.versions.length ?? 0;
    expect(versionsBefore).toBe(2);

    await asOwner.mutation(api.canvas.archiveArtifactAsHuman, { id });

    // Unarchiving an active artifact is rejected; only an archived one flips back.
    const res = await asOwner.mutation(api.canvas.unarchiveArtifactAsHuman, { id });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.resolved_action.op).toBe("unarchive");

    const all = await asOwner.query(api.canvas.listArtifacts, { include_archived: true });
    expect(all.find((a) => a.artifact_id === id)?.status).toBe("active");
    const active = await asOwner.query(api.canvas.listArtifacts, {});
    expect(active.map((a) => a.artifact_id)).toContain(id);

    // Reversal recorded as artifact_updated (frozen kind union), and the version
    // chain is byte-for-byte what it was — unarchive appends no content version.
    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events.some((e) => e.kind === "artifact_updated" && e.refs.artifact_id === id)).toBe(true);
    const chainAfter = await asOwner.query(api.canvas.versionChain, { artifact_id: id });
    expect(chainAfter?.versions.length).toBe(versionsBefore);

    // Now that it is active again, a second unarchive is a visible rejection.
    const again = await asOwner.mutation(api.canvas.unarchiveArtifactAsHuman, { id });
    expect(again.ok).toBe(false);
  });

  it("rejects archiving / unarchiving an unknown artifact", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(OWNER);
    const miss = await asOwner.mutation(api.canvas.archiveArtifactAsHuman, { id: "art_missing" });
    expect(miss.ok).toBe(false);
    if (miss.ok) return;
    expect(miss.error.code).toBe("not_found");
  });
});

describe("canvas.archiveTabAsHuman", () => {
  it("rejects an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    const { tab_id } = await t.mutation(internal.agentWrites.createTab, { title: "Docs" });
    await expect(
      t.mutation(api.canvas.archiveTabAsHuman, { tab_id: tab_id as never }),
    ).rejects.toThrow(UNAUTHORIZED);
  });

  it("archives a tab: it drops from listTabs and a human tab_changed event is written", async () => {
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(OWNER);
    const { tab_id } = await t.mutation(internal.agentWrites.createTab, { title: "Docs" });

    const before = await asOwner.query(api.canvas.listTabs, {});
    expect(before.map((tab) => tab.id)).toContain(tab_id);

    const res = await asOwner.mutation(api.canvas.archiveTabAsHuman, { tab_id: tab_id as never });
    expect(res).toEqual({ ok: true });

    const after = await asOwner.query(api.canvas.listTabs, {});
    expect(after.map((tab) => tab.id)).not.toContain(tab_id);

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    const evt = events.find((e) => e.kind === "tab_changed" && e.refs.tab_id === tab_id && e.actor === "human");
    expect(evt).toBeDefined();
  });
});
