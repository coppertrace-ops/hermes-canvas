import { describe, expect, it } from "vitest";
import { diffLines, diffWords, joinSide, tokenizeWords } from "./text";

describe("tokenizeWords", () => {
  it("is loss-less (join reconstructs the input)", () => {
    const s = "the  cat\tsat\non   the mat";
    expect(tokenizeWords(s).join("")).toBe(s);
  });
});

describe("diffWords", () => {
  it("highlights only the changed word, not the surrounding spaces", () => {
    const words = diffWords("the cat sat", "the dog sat");
    expect(joinSide(words, "before")).toBe("the cat sat");
    expect(joinSide(words, "after")).toBe("the dog sat");
    const changed = words.filter((w) => w.type !== "eq").map((w) => w.value.trim());
    expect(changed).toContain("cat");
    expect(changed).toContain("dog");
    // The unchanged words survive as eq tokens.
    expect(words.some((w) => w.type === "eq" && w.value.includes("the"))).toBe(true);
  });

  it("round-trips both sides for an insertion", () => {
    const words = diffWords("hello world", "hello brave new world");
    expect(joinSide(words, "before")).toBe("hello world");
    expect(joinSide(words, "after")).toBe("hello brave new world");
  });
});

describe("diffLines", () => {
  it("reports identical for byte-equal input", () => {
    const d = diffLines("a\nb\nc", "a\nb\nc");
    expect(d.identical).toBe(true);
    expect(d.hunks).toHaveLength(0);
  });

  it("normalizes CRLF so EOL style is not a diff", () => {
    const d = diffLines("a\r\nb", "a\nb");
    expect(d.identical).toBe(true);
  });

  it("produces a hunk with correct line numbers for a single change", () => {
    const before = "line1\nline2\nline3\nline4\nline5";
    const after = "line1\nline2\nCHANGED\nline4\nline5";
    const d = diffLines(before, after);
    expect(d.identical).toBe(false);
    expect(d.hunks).toHaveLength(1);
    const del = d.hunks[0]!.lines.find((l) => l.type === "del");
    const ins = d.hunks[0]!.lines.find((l) => l.type === "ins");
    expect(del?.oldNumber).toBe(3);
    expect(ins?.newNumber).toBe(3);
  });

  it("keeps distant changes in separate hunks", () => {
    const before = Array.from({ length: 30 }, (_, i) => `l${i}`).join("\n");
    const afterLines = before.split("\n");
    afterLines[1] = "X";
    afterLines[28] = "Y";
    const d = diffLines(before, afterLines.join("\n"));
    expect(d.hunks.length).toBe(2);
  });
});
