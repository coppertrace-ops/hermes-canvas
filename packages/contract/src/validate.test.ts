import { describe, expect, it } from "vitest";
import { CanvasError } from "./errors";
import { mermaidRenderState, validateContent } from "./validate";

/**
 * Type-specific validation (plan §2.2): mermaid parse failures are STORED but
 * flagged render_error (never a blank); malformed boards are hard-rejected;
 * markdown/html-static are opaque within the size cap.
 */

describe("mermaid render-state pre-check", () => {
  it("accepts a declared diagram type", () => {
    expect(mermaidRenderState("flowchart TD\n A --> B")).toBe("ok");
    expect(mermaidRenderState("sequenceDiagram\n A->>B: hi")).toBe("ok");
  });
  it("flags content that declares no known diagram type", () => {
    expect(mermaidRenderState("this is not mermaid")).toBe("render_error");
    expect(mermaidRenderState("")).toBe("render_error");
  });
  it("validateContent returns render_error for bad mermaid but does not throw", () => {
    const out = validateContent("mermaid", "definitely not a diagram");
    expect(out.render_state).toBe("render_error");
  });
});

describe("board validation", () => {
  it("accepts a well-formed board", () => {
    const board = JSON.stringify({ columns: [{ id: "c1", title: "Todo", cards: [] }] });
    expect(validateContent("board", board).render_state).toBe("ok");
  });
  it("rejects malformed board JSON with a validation error", () => {
    expect(() => validateContent("board", "{not json")).toThrowError(CanvasError);
    expect(() => validateContent("board", JSON.stringify({ columns: [{ title: "no id" }] }))).toThrowError(CanvasError);
  });
});

describe("markdown/html are opaque within the size cap", () => {
  it("accepts arbitrary markdown", () => {
    expect(validateContent("markdown", "# anything <script>").render_state).toBe("ok");
  });
  it("accepts arbitrary html-static (sandbox is the renderer's job)", () => {
    expect(validateContent("html-static", "<h1>hi</h1>").render_state).toBe("ok");
  });
});
