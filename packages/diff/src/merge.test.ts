import { describe, expect, it } from "vitest";
import { buildMergePrompt, contendedVersions } from "./merge";
import { scriptedSession } from "./fixtures";

/**
 * Plan §2.2/§3: a contended write (parent_seq != head) lands anyway (append-only)
 * and must be surfaced with a merge prompt — never silently dropped. The scripted
 * session's v13 forked off v11 while head was v12.
 */
describe("buildMergePrompt — stale-parent contention is visibly represented", () => {
  const { versions } = scriptedSession();

  it("identifies the contended version in the chain", () => {
    expect(contendedVersions(versions)).toEqual([13]);
  });

  it("builds a prompt exposing base, head, and both intents", () => {
    const prompt = buildMergePrompt("markdown", versions, 13, 12);
    expect(prompt.contendedSeq).toBe(13);
    expect(prompt.baseSeq).toBe(11); // v13's parent
    expect(prompt.headSeq).toBe(12);
    expect(prompt.summary).toContain("head had already advanced");
    // Both diffs against base are present (data-loss-free reconciliation).
    expect(prompt.headVsBase).not.toBeNull();
    expect(prompt.contendedVsBase).not.toBeNull();
  });

  it("offers only append-only resolutions (no destructive option)", () => {
    const prompt = buildMergePrompt("markdown", versions, 13, 12);
    const kinds = prompt.options.map((o) => o.kind);
    expect(kinds).toContain("keep_head");
    expect(kinds).toContain("take_contended");
    expect(kinds).toContain("manual");
    // No "delete"/"overwrite" resolution exists.
    expect(kinds).not.toContain("delete");
  });

  it("diffs the contended write against head so the reader sees the net change", () => {
    const prompt = buildMergePrompt("markdown", versions, 13, 12);
    // v13 renamed "Goals" → "Objectives" off a stale parent; that shows vs head.
    expect(prompt.contendedVsHead.body.kind).toBe("markdown");
    expect(prompt.contendedVsHead.identical).toBe(false);
  });

  it("throws for a missing version", () => {
    expect(() => buildMergePrompt("markdown", versions, 999)).toThrow(/not found/);
  });
});
