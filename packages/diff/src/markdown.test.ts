import { describe, expect, it } from "vitest";
import { diffMarkdown, segmentBlocks } from "./markdown";

describe("segmentBlocks", () => {
  it("splits on blank lines and classifies blocks", () => {
    const src = "# Title\n\nA paragraph.\n\n- item 1\n- item 2\n\n```js\ncode();\n```";
    const blocks = segmentBlocks(src);
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "list", "code"]);
  });

  it("keeps a fenced code block atomic even with blank lines inside", () => {
    const src = "```\nline 1\n\nline 3\n```";
    const blocks = segmentBlocks(src);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.kind).toBe("code");
    expect(blocks[0]!.text).toContain("line 3");
  });

  it("tracks the source start line of each block", () => {
    const src = "# H\n\npara one\n\npara two";
    const blocks = segmentBlocks(src);
    expect(blocks[0]!.startLine).toBe(1);
    expect(blocks[2]!.startLine).toBe(5);
  });
});

describe("diffMarkdown — identical", () => {
  it("flags identical documents", () => {
    const doc = "# Design\n\nThe auth section.\n\n## Notes\n\nSome notes.";
    const d = diffMarkdown(doc, doc);
    expect(d.identical).toBe(true);
    expect(d.blocks.every((b) => b.status === "unchanged")).toBe(true);
  });
});

/**
 * G4 adversarial case 1: a whole-document rewrite must be visibly a rewrite — a
 * long run of changed/added/removed blocks, NOT a tidy single-block edit. The
 * server labels it `replace_all`; here we assert the diff SHAPE also reflects a
 * sweeping change (see artifact.test.ts for the label assertion).
 */
describe("diffMarkdown — whole-document rewrite (adversarial)", () => {
  it("shows a sweeping change across most blocks", () => {
    const before =
      "# Project Plan\n\nWe will build A first.\n\n## Timeline\n\nSix weeks.\n\n## Risks\n\nScope creep.";
    const after =
      "# Marketing Brief\n\nLaunch targets Q3.\n\n## Audience\n\nEnterprise buyers.\n\n## Channels\n\nEmail and events.";
    const d = diffMarkdown(before, after);
    expect(d.identical).toBe(false);
    const unchanged = d.blocks.filter((b) => b.status === "unchanged").length;
    const touched = d.blocks.filter((b) => b.status !== "unchanged").length;
    // A true rewrite touches (far) more than it leaves alone.
    expect(touched).toBeGreaterThan(unchanged);
    expect(touched).toBeGreaterThanOrEqual(3);
  });
});

/**
 * G4 adversarial case 2: a localized region edit must show ONLY the region —
 * exactly one changed block, every other block untouched. This is the defense
 * against incumbent truncation/overwrite failures being visually indistinguishable
 * from surgical edits.
 */
describe("diffMarkdown — localized region edit (adversarial)", () => {
  const before = [
    "# Design notes",
    "",
    "## Overview",
    "",
    "This document describes the system.",
    "",
    "## Auth",
    "",
    "Auth uses sessions and a shared secret.",
    "",
    "## Storage",
    "",
    "All state lives in Convex.",
  ].join("\n");

  const after = [
    "# Design notes",
    "",
    "## Overview",
    "",
    "This document describes the system.",
    "",
    "## Auth",
    "",
    "Auth uses JWT sessions and a rotated service token.",
    "",
    "## Storage",
    "",
    "All state lives in Convex.",
  ].join("\n");

  it("changes exactly one block and leaves the rest unchanged", () => {
    const d = diffMarkdown(before, after);
    const changed = d.blocks.filter((b) => b.status === "changed");
    const addedRemoved = d.blocks.filter((b) => b.status === "added" || b.status === "removed");
    expect(changed).toHaveLength(1);
    expect(addedRemoved).toHaveLength(0);
    // The overview and storage paragraphs, and all headings, remain unchanged.
    const unchangedText = d.blocks
      .filter((b) => b.status === "unchanged")
      .map((b) => (b as { block: { text: string } }).block.text);
    expect(unchangedText).toContain("This document describes the system.");
    expect(unchangedText).toContain("All state lives in Convex.");
  });

  it("word-diffs within the changed block so only the edited words highlight", () => {
    const d = diffMarkdown(before, after);
    const changed = d.blocks.find((b) => b.status === "changed") as
      { status: "changed"; words: { type: string; value: string }[] } | undefined;
    expect(changed).toBeDefined();
    const inserted = changed!.words.filter((w) => w.type === "ins").map((w) => w.value.trim());
    // "sessions" is shared → stays eq; "JWT", "rotated", "service", "token" are new.
    expect(inserted.join(" ")).toContain("JWT");
    expect(changed!.words.some((w) => w.type === "eq" && w.value.includes("Auth"))).toBe(true);
  });
});

describe("diffMarkdown — append", () => {
  it("marks a purely appended block as added, nothing changed", () => {
    const before = "# Doc\n\nParagraph one.";
    const after = "# Doc\n\nParagraph one.\n\nParagraph two, brand new.";
    const d = diffMarkdown(before, after);
    expect(d.addedBlocks).toBe(1);
    expect(d.changedBlocks).toBe(0);
    expect(d.removedBlocks).toBe(0);
  });
});
