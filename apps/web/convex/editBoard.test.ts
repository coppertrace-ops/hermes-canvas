/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Human board-edit mutation specs (WP7 / Gate G6, plan §6).
 *
 * `canvas.editBoard` is the browser drag path: a human drag lands as ONE appended
 * version, exactly like the agent's PATCH. Proves: owner-gated; append-only (a new
 * seq, chain unchanged); a stale parent_seq lands + flags `contended` (the
 * simultaneous human+agent edit → merge-prompt path, never silent loss); malformed
 * board JSON is a visible structured rejection (never truncation); a non-board
 * artifact is refused.
 */

const modules = import.meta.glob("./**/!(*.test).*s");
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };

function boardJson(doingCards: string[] = []): string {
  return JSON.stringify({
    columns: [
      { id: "todo", title: "To do", cards: [{ id: "c1", title: "First", body: "", labels: [] }] },
      { id: "doing", title: "Doing", cards: doingCards.map((id) => ({ id, title: id, body: "", labels: [] })) },
    ],
  });
}

async function seedBoard(t: ReturnType<typeof convexTest>) {
  const created = await t.mutation(internal.agentWrites.createArtifact, {
    type: "board",
    title: "Sprint",
    content: boardJson(),
    why: "seed board",
  });
  if (!created.ok) throw new Error("seed failed");
  return created.result;
}

describe("canvas.editBoard", () => {
  it("appends one version for a human drag (append-only, owner-gated)", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedBoard(t);

    const res = await t.withIdentity(OWNER).mutation(api.canvas.editBoard, {
      artifact_id: seed.artifact_id,
      parent_seq: seed.head_seq,
      content: boardJson(["c1"]), // moved c1 → Doing
      why: "moved First to Doing",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.seq).toBe(seed.head_seq + 1);
    expect(res.result.contended).toBe(false);

    const chain = await t.withIdentity(OWNER).query(api.canvas.versionChain, { artifact_id: seed.artifact_id });
    expect(chain?.versions.length).toBe(2);
    expect(chain?.versions[1]?.author).toBe("human");
    expect(chain?.head_seq).toBe(seed.head_seq + 1);
  });

  it("rejects an anonymous caller and writes nothing", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedBoard(t);
    await expect(
      t.mutation(api.canvas.editBoard, {
        artifact_id: seed.artifact_id,
        parent_seq: seed.head_seq,
        content: boardJson(["c1"]),
        why: "sneaky",
      }),
    ).rejects.toThrow();
    const chain = await t.withIdentity(OWNER).query(api.canvas.versionChain, { artifact_id: seed.artifact_id });
    expect(chain?.versions.length).toBe(1);
  });

  it("flags a stale parent_seq contended (never drops the write)", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedBoard(t);
    // An agent moves the head forward underneath the human's stale read.
    const agent = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: seed.artifact_id,
      parent_seq: seed.head_seq,
      why: "agent edit",
      edit: { mode: "replace_all", content: boardJson(["c9"]) },
    });
    expect(agent.ok).toBe(true);

    const human = await t.withIdentity(OWNER).mutation(api.canvas.editBoard, {
      artifact_id: seed.artifact_id,
      parent_seq: seed.head_seq, // stale — head already advanced
      content: boardJson(["c1"]),
      why: "human drag on a stale base",
    });
    expect(human.ok).toBe(true);
    if (!human.ok) return;
    expect(human.result.contended).toBe(true);

    const chain = await t.withIdentity(OWNER).query(api.canvas.versionChain, { artifact_id: seed.artifact_id });
    expect(chain?.versions.length).toBe(3); // both writes landed
  });

  it("rejects malformed board JSON visibly (no truncation)", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedBoard(t);
    const res = await t.withIdentity(OWNER).mutation(api.canvas.editBoard, {
      artifact_id: seed.artifact_id,
      parent_seq: seed.head_seq,
      content: "{ not valid board json",
      why: "oops",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("validation_failed");
    const chain = await t.withIdentity(OWNER).query(api.canvas.versionChain, { artifact_id: seed.artifact_id });
    expect(chain?.versions.length).toBe(1); // unchanged
  });

  it("refuses to edit a non-board artifact", async () => {
    const t = convexTest(schema, modules);
    const created = await t.mutation(internal.agentWrites.createArtifact, {
      type: "markdown",
      title: "Notes",
      content: "hi",
      why: "seed",
    });
    if (!created.ok) throw new Error("seed failed");
    const res = await t.withIdentity(OWNER).mutation(api.canvas.editBoard, {
      artifact_id: created.result.artifact_id,
      parent_seq: created.result.head_seq,
      content: boardJson(),
      why: "wrong type",
    });
    expect(res.ok).toBe(false);
  });
});
