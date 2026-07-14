import { describe, expect, it } from "vitest";
import { CanvasCore } from "./core";
import { CanvasError } from "./errors";
import { LIMITS } from "./limits";

/**
 * Gate G1 — contract-freeze proofs (plan §8).
 *
 * These run against the append-only in-memory reference core (`CanvasCore`),
 * which applies the exact pure plans the Convex mutations use. No Convex login
 * or deployment is required to prove the load-bearing behaviours.
 */

function mkMarkdown(core: CanvasCore, title = "Doc", content = "# Title\n\nbody") {
  return core.createArtifact({ type: "markdown", title, content, why: "seed" });
}

describe("G1: seq is strictly monotonic per artifact and globally", () => {
  it("assigns head+1 on every write, never repeating or regressing", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core);
    const seqs: number[] = [1];
    for (let i = 0; i < 10; i++) {
      const r = core.updateArtifact(artifact_id, {
        parent_seq: seqs[seqs.length - 1]!,
        why: `edit ${i}`,
        edit: { mode: "replace_all", content: `v${i}` },
      });
      seqs.push(r.seq);
    }
    for (let i = 1; i < seqs.length; i++) expect(seqs[i]!).toBe(seqs[i - 1]! + 1);
    // Head reflects the last seq.
    expect(core.readArtifact(artifact_id).artifact.head_seq).toBe(11);
  });

  it("keeps the global event seq strictly increasing under interleaved writes", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const a = mkMarkdown(core, "A").artifact_id;
    const b = mkMarkdown(core, "B").artifact_id;
    for (let i = 0; i < 5; i++) {
      core.updateArtifact(a, { parent_seq: i + 1, why: "x", edit: { mode: "replace_all", content: `a${i}` } });
      core.updateArtifact(b, { parent_seq: i + 1, why: "x", edit: { mode: "replace_all", content: `b${i}` } });
    }
    const evSeqs = core.getEvents().map((e) => e.seq);
    for (let i = 1; i < evSeqs.length; i++) expect(evSeqs[i]!).toBeGreaterThan(evSeqs[i - 1]!);
  });
});

describe("G1: stale parent_seq — both versions land + contended flag", () => {
  it("lands the second writer's edit and flags it contended (no data loss)", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core); // seq 1, head 1

    // Two writers both read seq 1. First lands cleanly.
    const first = core.updateArtifact(artifact_id, {
      parent_seq: 1,
      why: "writer A",
      edit: { mode: "replace_all", content: "A wins the head" },
    });
    expect(first.seq).toBe(2);
    expect(first.contended).toBe(false);

    // Second writer still based on the now-stale seq 1.
    const second = core.updateArtifact(artifact_id, {
      parent_seq: 1,
      why: "writer B",
      edit: { mode: "replace_all", content: "B based on stale parent" },
    });
    expect(second.seq).toBe(3);
    expect(second.contended).toBe(true);

    // BOTH versions are stored — append-only, nothing overwritten.
    const versions = core.getVersions(artifact_id);
    expect(versions.map((v) => v.seq)).toEqual([1, 2, 3]);
    expect(core.readArtifact(artifact_id, 2).version.content).toBe("A wins the head");
    expect(core.readArtifact(artifact_id, 3).version.content).toBe("B based on stale parent");
  });
});

describe("G1: oversize — structured rejection + limit_rejected event, never truncation", () => {
  it("rejects an oversize create with a structured error and stores no artifact", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const big = "x".repeat(LIMITS.VERSION_CONTENT_BYTES + 1);
    let caught: CanvasError | undefined;
    try {
      core.createArtifact({ type: "markdown", title: "Big", content: big, why: "too big" });
    } catch (e) {
      caught = e as CanvasError;
    }
    expect(caught).toBeInstanceOf(CanvasError);
    expect(caught!.error.code).toBe("oversize");
    expect(caught!.status).toBe(413);
    expect(caught!.error.detail).toMatchObject({ limit: "VERSION_CONTENT_BYTES", unit: "bytes" });

    // No artifact/version was created — nothing was truncated to fit.
    expect(core.listArtifacts()).toHaveLength(0);
    expect(core.getVersions()).toHaveLength(0);
    // The rejection is evidence, not silence.
    const rejects = core.getEvents().filter((e) => e.kind === "limit_rejected");
    expect(rejects).toHaveLength(1);
  });

  it("rejects an oversize update without touching the existing head content", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core, "Doc", "safe content");
    const big = "y".repeat(LIMITS.VERSION_CONTENT_BYTES + 100);
    expect(() =>
      core.updateArtifact(artifact_id, {
        parent_seq: 1,
        why: "grow",
        edit: { mode: "replace_all", content: big },
      }),
    ).toThrowError(CanvasError);

    expect(core.readArtifact(artifact_id).artifact.head_seq).toBe(1);
    expect(core.readArtifact(artifact_id).version.content).toBe("safe content");
    expect(core.getVersions(artifact_id)).toHaveLength(1);
    expect(core.getEvents().some((e) => e.kind === "limit_rejected")).toBe(true);
  });
});

describe("G1: rejection events carry the true error code (semantic fidelity)", () => {
  it("labels a real limit breach with rejected_code 'oversize'", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const big = "x".repeat(LIMITS.VERSION_CONTENT_BYTES + 1);
    try {
      core.createArtifact({ type: "markdown", title: "Big", content: big, why: "too big" });
    } catch {
      /* expected */
    }
    const rejects = core.getEvents().filter((e) => e.kind === "limit_rejected");
    expect(rejects).toHaveLength(1);
    // The frozen kind is a coarse bucket; the payload carries the precise cause.
    expect(rejects[0]!.refs.rejected_code).toBe("oversize");
  });

  it("distinguishes a non-limit refusal (validation_failed) from an actual limit hit", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core, "Doc", "# H\n\nbody");
    // A region edit citing a parent_seq that does not exist is a validation
    // refusal, not a limit breach — but it is still recorded as evidence.
    expect(() =>
      core.updateArtifact(artifact_id, {
        parent_seq: 999,
        why: "edit against a missing parent",
        edit: { mode: "region", anchor: { heading: "H" }, content: "x" },
      }),
    ).toThrowError(CanvasError);
    const rejects = core.getEvents().filter((e) => e.kind === "limit_rejected");
    expect(rejects).toHaveLength(1);
    // Same coarse kind, but the code makes clear no *limit* was breached.
    expect(rejects[0]!.refs.rejected_code).toBe("validation_failed");
  });
});

describe("G1: restore appends a new version equal to an old one", () => {
  it("restore adds a version whose content matches the source and op=restore", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core, "Doc", "original");
    core.updateArtifact(artifact_id, { parent_seq: 1, why: "change", edit: { mode: "replace_all", content: "changed" } });

    const restored = core.restoreArtifact(artifact_id, 1, "put it back");
    expect(restored.seq).toBe(3);
    expect(restored.resolved_action.op).toBe("restore");
    expect(restored.resolved_action.restored_from_seq).toBe(1);
    expect(core.readArtifact(artifact_id, 3).version.content).toBe("original");
    // The chain grew; nothing was excised.
    expect(core.getVersions(artifact_id).map((v) => v.seq)).toEqual([1, 2, 3]);
  });
});

describe("G1: no code path mutates versions/events (append-only, frozen)", () => {
  it("freezes stored versions and events", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core);
    core.updateArtifact(artifact_id, { parent_seq: 1, why: "e", edit: { mode: "replace_all", content: "v2" } });
    for (const v of core.getVersions()) expect(Object.isFrozen(v)).toBe(true);
    for (const e of core.getEvents()) expect(Object.isFrozen(e)).toBe(true);
  });

  it("leaves prior history byte-identical after a restore (append, not rewrite)", () => {
    const core = new CanvasCore({ now: () => 1000 });
    const { artifact_id } = mkMarkdown(core, "Doc", "original");
    core.updateArtifact(artifact_id, { parent_seq: 1, why: "c", edit: { mode: "replace_all", content: "changed" } });
    const before = core.getVersions(artifact_id).map((v) => ({ ...v }));
    core.restoreArtifact(artifact_id, 1, "back");
    const after = core.getVersions(artifact_id);
    expect(after).toHaveLength(before.length + 1);
    for (let i = 0; i < before.length; i++) expect(after[i]).toEqual(before[i]);
  });
});

describe("G1: rate limits return structured 429s", () => {
  it("throws a structured artifact-scope rate limit at the per-artifact ceiling", () => {
    const core = new CanvasCore({ now: () => 5000 }); // fixed clock -> all writes in one window
    const { artifact_id } = mkMarkdown(core); // write #1
    // Fill to the ceiling.
    for (let i = 0; i < LIMITS.WRITES_PER_MIN_PER_ARTIFACT - 1; i++) {
      core.updateArtifact(artifact_id, { parent_seq: 1, why: "x", edit: { mode: "replace_all", content: `v${i}` } });
    }
    let caught: CanvasError | undefined;
    try {
      core.updateArtifact(artifact_id, { parent_seq: 1, why: "over", edit: { mode: "replace_all", content: "over" } });
    } catch (e) {
      caught = e as CanvasError;
    }
    expect(caught?.error.code).toBe("rate_limited");
    expect(caught?.status).toBe(429);
    expect(caught?.error.detail).toMatchObject({ scope: "artifact", limit: LIMITS.WRITES_PER_MIN_PER_ARTIFACT });
    expect((caught?.error.detail as { retry_after_ms: number }).retry_after_ms).toBeGreaterThan(0);
  });

  it("throws a structured global rate limit across many artifacts", () => {
    const core = new CanvasCore({ now: () => 5000 });
    for (let i = 0; i < LIMITS.AGENT_WRITES_PER_MIN_GLOBAL; i++) {
      core.createArtifact({ type: "markdown", title: `A${i}`, content: "c", why: "seed" });
    }
    let caught: CanvasError | undefined;
    try {
      core.createArtifact({ type: "markdown", title: "one too many", content: "c", why: "seed" });
    } catch (e) {
      caught = e as CanvasError;
    }
    expect(caught?.error.code).toBe("rate_limited");
    expect(caught?.error.detail).toMatchObject({ scope: "global", limit: LIMITS.AGENT_WRITES_PER_MIN_GLOBAL });
  });

  it("frees a slot once the window advances", () => {
    let t = 0;
    const core = new CanvasCore({ now: () => t });
    const { artifact_id } = mkMarkdown(core);
    for (let i = 0; i < LIMITS.WRITES_PER_MIN_PER_ARTIFACT - 1; i++) {
      core.updateArtifact(artifact_id, { parent_seq: 1, why: "x", edit: { mode: "replace_all", content: `v${i}` } });
    }
    expect(() =>
      core.updateArtifact(artifact_id, { parent_seq: 1, why: "over", edit: { mode: "replace_all", content: "o" } }),
    ).toThrowError(CanvasError);
    // Advance beyond the window; the ledger entries age out.
    t = LIMITS.RATE_WINDOW_MS + 1;
    const ok = core.updateArtifact(artifact_id, {
      parent_seq: 1,
      why: "later",
      edit: { mode: "replace_all", content: "later" },
    });
    expect(ok.contended).toBe(true); // parent 1 is stale by now, but it still lands
  });
});
