import { describe, expect, it } from "vitest";
import type { ResolvedAction } from "@hermes/contract";
import { buildHeader, diffArtifact } from "./artifact";

/**
 * The dispatcher's header must reflect the server-recorded `resolved_action`
 * VERBATIM — never re-inferred from content. This is the G4 "whole-doc rewrite
 * labeled as such" requirement: the label comes from ground truth.
 */
describe("buildHeader — labels from resolved_action, not content", () => {
  it("labels a replace_all as a whole-document rewrite", () => {
    const ra: ResolvedAction = { op: "replace_all", target: "art_1" };
    expect(buildHeader({ seq: 2, content: "x", resolvedAction: ra }).label).toBe(
      "Whole-document rewrite",
    );
  });

  it("labels a region edit with its resolved region", () => {
    const ra: ResolvedAction = { op: "region", target: "art_1", region: 'heading:"Auth"' };
    const h = buildHeader({ seq: 3, content: "x", resolvedAction: ra });
    expect(h.scope).toBe("region");
    expect(h.label).toContain('heading:"Auth"');
  });

  it("labels a restore with the source seq", () => {
    const ra: ResolvedAction = { op: "restore", target: "art_1", restored_from_seq: 4 };
    const h = buildHeader({ seq: 9, content: "x", resolvedAction: ra });
    expect(h.label).toBe("Restored from v4");
    expect(h.restoredFromSeq).toBe(4);
  });

  it("falls back to 'Updated' when no resolved_action is present", () => {
    expect(buildHeader({ seq: 2, content: "x" }).label).toBe("Updated");
  });
});

describe("diffArtifact — markdown", () => {
  it("labels a region edit AND localizes the diff to one block", () => {
    const before = "# Doc\n\n## Auth\n\nUses sessions.\n\n## Storage\n\nConvex.";
    const after = "# Doc\n\n## Auth\n\nUses JWT sessions with rotation.\n\n## Storage\n\nConvex.";
    const d = diffArtifact(
      "markdown",
      { seq: 1, content: before },
      {
        seq: 2,
        content: after,
        resolvedAction: { op: "region", target: "a", region: 'heading:"Auth"' },
      },
    );
    expect(d.header.scope).toBe("region");
    expect(d.body.kind).toBe("markdown");
    if (d.body.kind === "markdown") {
      expect(d.body.diff.changedBlocks).toBe(1);
      expect(d.body.diff.addedBlocks + d.body.diff.removedBlocks).toBe(0);
    }
  });

  it("treats a null before (create version) as all-inserted", () => {
    const d = diffArtifact("markdown", null, {
      seq: 1,
      content: "# New\n\nBody.",
      resolvedAction: { op: "create" },
    });
    expect(d.header.scope).toBe("create");
    if (d.body.kind === "markdown") {
      expect(d.body.diff.addedBlocks).toBeGreaterThan(0);
    }
  });
});

describe("diffArtifact — mermaid & html carry render-error state", () => {
  it("mermaid produces before/after sides with render-error flags", () => {
    const d = diffArtifact(
      "mermaid",
      { seq: 1, content: "graph TD\nA-->B", renderState: "ok" },
      { seq: 2, content: "graph TD\nA-->C", renderState: "render_error" },
    );
    expect(d.body.kind).toBe("mermaid");
    if (d.body.kind === "mermaid") {
      expect(d.body.diff.after.renderError).toBe(true);
      expect(d.body.diff.before.renderError).toBe(false);
      expect(d.body.diff.source.identical).toBe(false);
    }
  });
});

describe("diffArtifact — board fallback on malformed JSON", () => {
  it("falls back to a visible source diff rather than throwing", () => {
    const d = diffArtifact("board", { seq: 1, content: "{}" }, { seq: 2, content: "not json{" });
    expect(d.body.kind).toBe("board-fallback");
    if (d.body.kind === "board-fallback") {
      expect(d.body.error).toBeTruthy();
    }
  });
});
