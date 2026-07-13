/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Version-chain query test (OWNER: PROOF, closing the history live-bridge gap).
 *
 * `canvas.versionChain` is the query the CHRONICLE `HistoryPanel` needs but did
 * not have: the FULL append-only chain of an artifact, ordered by seq, each
 * version carrying its `why` / `author` / `resolved_action` metadata. This proves
 * a real create+update sequence produces an ordered chain with that metadata, and
 * that an unknown artifact yields `null` (the panel's honest empty state).
 */

const modules = import.meta.glob("./**/!(*.test).*s");

describe("canvas.versionChain", () => {
  it("returns the ordered chain with why / author / resolved_action metadata", async () => {
    const t = convexTest(schema, modules);

    const created = await t.mutation(internal.agentWrites.createArtifact, {
      type: "markdown",
      title: "Design notes",
      content: "one",
      why: "seed the notes",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const artifactId = created.result.artifact_id;

    const u1 = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: artifactId,
      parent_seq: created.result.head_seq,
      why: "second pass",
      edit: { mode: "replace_all", content: "two" },
    });
    expect(u1.ok).toBe(true);
    if (!u1.ok) return;

    const u2 = await t.mutation(internal.agentWrites.updateArtifact, {
      artifact_id: artifactId,
      parent_seq: u1.result.head_seq,
      why: "third pass",
      edit: { mode: "replace_all", content: "three" },
    });
    expect(u2.ok).toBe(true);
    if (!u2.ok) return;

    const chain = await t.query(api.canvas.versionChain, { artifact_id: artifactId });
    expect(chain).not.toBeNull();
    if (!chain) return;

    // Three versions, strictly ascending by seq (ordered chain).
    expect(chain.versions).toHaveLength(3);
    const seqs = chain.versions.map((v) => v.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(chain.head_seq).toBe(u2.result.head_seq);

    // Metadata the history UI renders is present on every version.
    expect(chain.versions[0]!.resolved_action.op).toBe("create");
    expect(chain.versions[0]!.why).toBe("seed the notes");
    expect(chain.versions[2]!.why).toBe("third pass");
    expect(chain.versions.every((v) => v.author === "agent")).toBe(true);
    expect(chain.versions.every((v) => typeof v.content === "string")).toBe(true);

    // parent_seq links form the chain: each later version points at a prior seq.
    expect(chain.versions[0]!.parent_seq).toBeNull();
    expect(chain.versions[1]!.parent_seq).toBe(chain.versions[0]!.seq);
  });

  it("returns null for an unknown artifact (honest empty state)", async () => {
    const t = convexTest(schema, modules);
    const chain = await t.query(api.canvas.versionChain, { artifact_id: "art_missing" });
    expect(chain).toBeNull();
  });
});
