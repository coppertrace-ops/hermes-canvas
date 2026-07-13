import { describe, expect, it } from "vitest";
import { CanvasCore } from "./core";
import { byteLength } from "./limits";
import { resolveRegionEdit } from "./region";

/**
 * Region-edit resolution proofs (plan §2.3, C3) — the defence against
 * truncation/overwrite. A region edit changes only its span; the rest of the
 * document is byte-for-byte preserved, and the server records the exact range.
 */

const DOC = ["# Intro", "hello", "", "## Auth", "old auth text", "more", "", "## Tail", "end"].join("\n");

describe("resolveRegionEdit — heading anchor", () => {
  it("replaces only the section under the matched heading", () => {
    const res = resolveRegionEdit(DOC, { heading: "Auth" }, "## Auth\nnew auth body");
    expect(res.content).toBe(
      ["# Intro", "hello", "", "## Auth", "new auth body", "## Tail", "end"].join("\n"),
    );
    // The recorded byte range points at the new content inside the snapshot.
    expect(res.content.slice(res.byteRange.start, res.byteRange.end)).toBe("## Auth\nnew auth body");
    expect(res.description).toContain('heading:"Auth"');
  });

  it("leaves other sections byte-identical", () => {
    const res = resolveRegionEdit(DOC, { heading: "Auth" }, "## Auth\nX");
    expect(res.content.startsWith("# Intro\nhello\n\n")).toBe(true);
    expect(res.content.endsWith("## Tail\nend")).toBe(true);
  });

  it("throws when the heading is absent", () => {
    expect(() => resolveRegionEdit(DOC, { heading: "Nope" }, "x")).toThrowError(/heading not found/);
  });
});

describe("resolveRegionEdit — line range anchor", () => {
  it("replaces an inclusive 1-based line span", () => {
    const res = resolveRegionEdit(DOC, { start_line: 2, end_line: 2 }, "HELLO");
    expect(res.content.split("\n")[1]).toBe("HELLO");
    expect(res.content.split("\n")[0]).toBe("# Intro");
  });

  it("computes a byte range consistent with the prefix length", () => {
    const res = resolveRegionEdit(DOC, { start_line: 5, end_line: 6 }, "replaced");
    const prefix = res.content.slice(0, res.byteRange.start);
    expect(byteLength(prefix)).toBe(res.byteRange.start);
    expect(res.content.slice(res.byteRange.start, res.byteRange.end)).toBe("replaced");
  });

  it("throws on out-of-range or inverted line spans", () => {
    expect(() => resolveRegionEdit(DOC, { start_line: 3, end_line: 2 }, "x")).toThrowError();
    expect(() => resolveRegionEdit(DOC, { start_line: 1, end_line: 999 }, "x")).toThrowError();
  });
});

describe("region edits through the core record resolved_action + byte_range", () => {
  it("stores a region resolved_action with a byte range", () => {
    const core = new CanvasCore({ now: () => 1 });
    const { artifact_id } = core.createArtifact({ type: "markdown", title: "D", content: DOC, why: "seed" });
    const r = core.updateArtifact(artifact_id, {
      parent_seq: 1,
      why: "tighten auth",
      edit: { mode: "region", anchor: { heading: "Auth" }, content: "## Auth\ntightened" },
    });
    expect(r.resolved_action.op).toBe("region");
    expect(r.resolved_action.byte_range).toBeDefined();
    expect(r.contended).toBe(false);
    const head = core.readArtifact(artifact_id).version;
    expect(head.content).toContain("tightened");
    expect(head.content).toContain("# Intro"); // untouched section preserved
  });
});
