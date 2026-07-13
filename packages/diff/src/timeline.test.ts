import { describe, expect, it } from "vitest";
import { buildVersionTimeline, checkChainIntegrity } from "./timeline";
import { scriptedSession } from "./fixtures";

/**
 * G4: "a scripted 20-write agent session is fully reconstructable from the UI
 * alone — every write's what/why/when visible." The timeline model is that
 * reconstruction; these tests prove nothing is lost.
 */
describe("buildVersionTimeline — 20-write session reconstruction", () => {
  const { versions, headSeq } = scriptedSession();
  const timeline = buildVersionTimeline(versions, headSeq);

  it("keeps every version, newest-first", () => {
    expect(timeline.entries).toHaveLength(20);
    expect(timeline.entries[0]!.seq).toBe(20);
    expect(timeline.entries[19]!.seq).toBe(1);
  });

  it("carries a why (stated intent) for every write", () => {
    expect(timeline.entries.every((e) => typeof e.why === "string" && e.why.length > 0)).toBe(true);
  });

  it("carries the resolved_action (recorded effect) for every write", () => {
    expect(timeline.entries.every((e) => typeof e.resolvedAction.op === "string")).toBe(true);
  });

  it("carries a timestamp (when) for every write", () => {
    expect(timeline.entries.every((e) => typeof e.createdAt === "number")).toBe(true);
  });

  it("marks the head", () => {
    expect(timeline.entries[0]!.isHead).toBe(true);
    expect(timeline.entries.filter((e) => e.isHead)).toHaveLength(1);
  });

  it("labels the whole-document rewrite at v6", () => {
    const v6 = timeline.entries.find((e) => e.seq === 6)!;
    expect(v6.scope).toBe("replace_all");
    expect(v6.scopeLabel).toBe("Whole-document rewrite");
  });

  it("surfaces the restore at v20 with its source", () => {
    const v20 = timeline.entries.find((e) => e.seq === 20)!;
    expect(v20.scope).toBe("restore");
    expect(v20.scopeLabel).toBe("Restored from v5");
    expect(v20.author).toBe("human");
  });

  it("counts the contended write and flags its stale parent", () => {
    expect(timeline.contendedCount).toBe(1);
    const v13 = timeline.entries.find((e) => e.seq === 13)!;
    expect(v13.contended).toBe(true);
    expect(v13.forkedFromStaleParent).toBe(true);
    expect(v13.parentSeq).toBe(11);
  });

  it("counts the restore", () => {
    expect(timeline.restoreCount).toBe(1);
  });
});

describe("checkChainIntegrity", () => {
  it("passes for a well-formed append-only chain", () => {
    const { versions } = scriptedSession();
    expect(checkChainIntegrity(versions)).toEqual([]);
  });

  it("flags a seq gap", () => {
    const { versions } = scriptedSession();
    const broken = versions.filter((v) => v.seq !== 10);
    expect(checkChainIntegrity(broken).some((p) => p.includes("gap"))).toBe(true);
  });
});
