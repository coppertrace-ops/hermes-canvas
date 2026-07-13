import { describe, expect, it } from "vitest";
import { previewRestore, verifyRestoreAppended } from "./restore";
import { scriptedSession, version } from "./fixtures";

describe("previewRestore", () => {
  const { versions, headSeq } = scriptedSession();

  it("predicts the resulting seq as head + 1 and never overwrites head", () => {
    const p = previewRestore(versions, 5, headSeq);
    expect(p.resultingSeq).toBe(headSeq + 1);
    expect(p.currentHeadSeq).toBe(headSeq);
    expect(p.resolvedActionPreview.op).toBe("restore");
    expect(p.resolvedActionPreview.restored_from_seq).toBe(5);
    expect(p.message).toContain("append-only");
  });

  it("flags restoring the head as a no-op", () => {
    const p = previewRestore(versions, headSeq, headSeq);
    expect(p.isNoop).toBe(true);
  });

  it("throws when the source version does not exist", () => {
    expect(() => previewRestore(versions, 999, headSeq)).toThrow(/not found/);
  });
});

/**
 * G4: "restore provably appends (chain unchanged)." Simulate a restore by
 * appending a new version equal to the source, then assert every prior version is
 * byte-identical and the new head is exactly +1 with op 'restore'.
 */
describe("verifyRestoreAppended — append-only proof", () => {
  it("passes when the restore appends a new head equal to the source", () => {
    const { versions } = scriptedSession();
    const source = versions.find((v) => v.seq === 5)!;
    const after = [
      ...versions,
      version({
        seq: 21,
        parent_seq: 20,
        content: source.content,
        author: "human",
        why: "restore",
        resolved: { op: "restore", target: "art_1", restored_from_seq: 5 },
      }),
    ];
    expect(verifyRestoreAppended(versions, after, 5)).toEqual([]);
  });

  it("FAILS if a prior version was rewritten (history that lies)", () => {
    const { versions } = scriptedSession();
    const after = versions.map((v) => (v.seq === 3 ? { ...v, content: "TAMPERED" } : v));
    const problems = verifyRestoreAppended(versions, after, 5);
    expect(problems.some((p) => p.includes("content changed"))).toBe(true);
  });

  it("FAILS if the new head is not head + 1", () => {
    const { versions } = scriptedSession();
    // No append at all → head unchanged.
    const problems = verifyRestoreAppended(versions, versions, 5);
    expect(problems.some((p) => p.includes("expected new head"))).toBe(true);
  });
});
