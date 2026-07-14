/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

/**
 * Contention on the REAL Convex write mutation (OWNER: LEDGER, plan §2.2 / Gate G1).
 *
 * The pure sequencer is unit-tested in `@hermes/contract`; this drives the actual
 * `internal.agentWrites.updateArtifact` against an in-memory backend to prove the
 * store applies the plan correctly: two updates that both cite the SAME
 * `parent_seq` each land on their own strictly-increasing seq (append-only — the
 * loser is never dropped), and the second is flagged `contended` because its
 * parent was no longer the head. History stays intact: nothing is patched or
 * deleted, seqs are 1..n with no gaps.
 */

const modules = import.meta.glob("./**/!(*.test).*s");

describe("concurrent updates from the same parent_seq", () => {
  it("stores seq n and n+1, flags the second contended, and keeps history intact", async () => {
    const t = convexTest(schema, modules);

    const created = await t.mutation(internal.agentWrites.createArtifact, {
      type: "markdown",
      title: "Doc",
      content: "v1",
      why: "seed",
    });
    if (!created.ok) throw new Error("seed failed");
    const artifactId = created.result.artifact_id;
    expect(created.result.seq).toBe(1);

    // Both writers read seq 1 as their parent. The first advances the head to 2;
    // the second still cites 1 (now stale) and must land as a contended seq 3.
    const first = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: artifactId,
      parent_seq: 1,
      why: "writer A",
      edit: { mode: "replace_all", content: "A wins the head" },
    });
    const second = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: artifactId,
      parent_seq: 1,
      why: "writer B",
      edit: { mode: "replace_all", content: "B based on stale parent" },
    });

    if (!first.ok || !second.ok) throw new Error("an update was rejected unexpectedly");

    // Both writes landed on their own seq — n and n+1, neither dropped.
    expect(first.result.seq).toBe(2);
    expect(first.result.contended).toBe(false);
    expect(second.result.seq).toBe(3);
    expect(second.result.contended).toBe(true);

    // History is intact: three immutable versions, strictly increasing seqs, and
    // the content of each is preserved (the loser was NOT overwritten).
    const versions = await t.run((ctx) =>
      ctx.db
        .query("versions")
        .withIndex("by_artifact_seq", (q) => q.eq("artifact_id", artifactId))
        .collect(),
    );
    const bySeq = versions.slice().sort((a, b) => a.seq - b.seq);
    expect(bySeq.map((v) => v.seq)).toEqual([1, 2, 3]);
    expect(bySeq[1]!.content).toBe("A wins the head");
    expect(bySeq[2]!.content).toBe("B based on stale parent");
    expect(bySeq[2]!.contended).toBe(true);

    const artifact = await t.run((ctx) =>
      ctx.db
        .query("artifacts")
        .withIndex("by_art_key", (q) => q.eq("art_key", artifactId))
        .unique(),
    );
    expect(artifact?.head_seq).toBe(3);
  });
});
