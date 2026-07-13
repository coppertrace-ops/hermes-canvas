import { describe, it, expect } from "vitest";
import { parseInline, parseMarkdown } from "./sanitize";
import type { ImageNode, LinkNode } from "./types";

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
