import { describe, it, expect } from "vitest";
import { parseInline, parseMarkdown } from "./sanitize";
import type { EmphasisNode, ImageNode, LinkNode, TableNode, TextNode } from "./types";

/**
 * AST-level sanitizer checks (plan §4) — the invariants the React renderer
 * depends on, verified without a DOM.
 */
describe("parseInline — URL classification", () => {
  it("keeps http/https/mailto links but strips javascript:/data:/vbscript:", () => {
    for (const scheme of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox"]) {
      const [node] = parseInline(`[x](${scheme})`);
      expect(node?.type).toBe("link");
      expect((node as LinkNode).href).toBeNull();
      expect((node as LinkNode).blockedReason).toBe("unsafe-scheme");
    }
    const [ok] = parseInline("[x](https://example.com)");
    expect((ok as LinkNode).href).toBe("https://example.com");
  });

  it("blocks external and unsafe-scheme images, keeping the URL for display", () => {
    const [ext] = parseInline("![a](https://evil.example/x.png)");
    expect((ext as ImageNode).blocked).toBe(true);
    expect((ext as ImageNode).blockedReason).toBe("external");
    expect((ext as ImageNode).src).toBeNull();
    expect((ext as ImageNode).url).toBe("https://evil.example/x.png");

    const [js] = parseInline("![a](javascript:alert(1))");
    expect((js as ImageNode).blocked).toBe(true);
    expect((js as ImageNode).blockedReason).toBe("unsafe-scheme");
  });
});

describe("parseMarkdown — raw HTML never becomes markup", () => {
  it("carries raw HTML tags as literal text nodes", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>");
    expect(blocks).toHaveLength(1);
    const para = blocks[0]!;
    expect(para.type).toBe("paragraph");
    // A single text node holding the literal source — no element node type exists.
    expect(JSON.stringify(para)).toContain("<script>alert(1)</script>");
    expect(JSON.stringify(para)).not.toContain('"type":"image"');
  });
});

describe("parseMarkdown — GFM tables", () => {
  const cellText = (cells: TableNode["header"], i: number) =>
    (cells[i]![0] as TextNode).value;

  it("parses a header + delimiter + body rows into a table node", () => {
    const blocks = parseMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |");
    expect(blocks).toHaveLength(1);
    const table = blocks[0] as TableNode;
    expect(table.type).toBe("table");
    expect(table.align).toEqual([null, null]);
    expect(cellText(table.header, 0)).toBe("A");
    expect(cellText(table.header, 1)).toBe("B");
    expect(table.rows).toHaveLength(2);
    expect(cellText(table.rows[0]!, 0)).toBe("1");
    expect(cellText(table.rows[1]!, 1)).toBe("4");
  });

  it("reads per-column alignment from the delimiter colons", () => {
    const blocks = parseMarkdown("| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |");
    const table = blocks[0] as TableNode;
    expect(table.align).toEqual(["left", "center", "right"]);
  });

  it("works with no leading/trailing pipes", () => {
    const blocks = parseMarkdown("A | B\n--- | ---\n1 | 2");
    const table = blocks[0] as TableNode;
    expect(table.type).toBe("table");
    expect(cellText(table.header, 0)).toBe("A");
    expect(cellText(table.rows[0]!, 1)).toBe("2");
  });

  it("parses inline formatting inside cells (bold, code, safe link)", () => {
    const blocks = parseMarkdown(
      "| H |\n| --- |\n| **b** |\n| `c` |\n| [x](https://example.com) |",
    );
    const table = blocks[0] as TableNode;
    expect((table.rows[0]![0]![0] as EmphasisNode).type).toBe("emphasis");
    expect((table.rows[0]![0]![0] as EmphasisNode).strong).toBe(true);
    expect(table.rows[1]![0]![0]!.type).toBe("code");
    const link = table.rows[2]![0]![0] as LinkNode;
    expect(link.type).toBe("link");
    expect(link.href).toBe("https://example.com");
  });

  it("treats an escaped pipe as literal cell text, not a column break", () => {
    const blocks = parseMarkdown("| A | B |\n| --- | --- |\n| a \\| b | c |");
    const table = blocks[0] as TableNode;
    expect(table.rows[0]).toHaveLength(2);
    expect(cellText(table.rows[0]!, 0)).toBe("a | b");
    expect(cellText(table.rows[0]!, 1)).toBe("c");
  });

  it("pads short body rows and truncates overlong ones to the column count", () => {
    const blocks = parseMarkdown("| A | B |\n| --- | --- |\n| only |\n| x | y | z |");
    const table = blocks[0] as TableNode;
    expect(table.rows[0]).toHaveLength(2);
    expect(cellText(table.rows[0]!, 0)).toBe("only");
    expect(table.rows[0]![1]).toEqual([]); // padded empty cell
    expect(table.rows[1]).toHaveLength(2); // 'z' dropped
    expect(cellText(table.rows[1]!, 1)).toBe("y");
  });

  it("falls back to a paragraph when the delimiter row is missing", () => {
    const blocks = parseMarkdown("| A | B |\njust text");
    expect(blocks[0]!.type).toBe("paragraph");
    expect(JSON.stringify(blocks[0])).toContain("| A | B |");
  });

  it("falls back when header/delimiter column counts disagree", () => {
    const blocks = parseMarkdown("| A | B | C |\n| --- | --- |\n| 1 | 2 | 3 |");
    // Not a valid table → the whole run degrades to paragraph text, never throws.
    expect(blocks.every((b) => b.type !== "table")).toBe(true);
  });

  it("ends the table at a blank line and resumes normal blocks after", () => {
    const blocks = parseMarkdown("| A |\n| --- |\n| 1 |\n\nAfter.");
    expect(blocks[0]!.type).toBe("table");
    expect(blocks[1]!.type).toBe("paragraph");
    expect(JSON.stringify(blocks[1])).toContain("After.");
  });
});
