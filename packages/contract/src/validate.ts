import type { ArtifactType, RenderState } from "./artifact";
import { parseBoardContent } from "./board";
import { CanvasError } from "./errors";
import { byteLength, LIMITS } from "./limits";

/**
 * Type-specific content validation (plan §2.2) — PURE.
 *
 * Rules, verbatim from the plan:
 * - Oversize → visible rejection naming the limit, NEVER truncation.
 * - Markdown → stored raw (sanitised at render, not here).
 * - Board → must match the frozen board JSON schema, else validation_failed.
 * - Mermaid → parse-checked; a failure is STORED but flagged `render_error` so
 *   the UI shows error + raw source, never a blank. (Full render validation is
 *   the renderer's job; this is the cheap, DOM-free structural pre-check.)
 * - html-static → opaque text; its safety is the sandbox renderer's job (§4).
 *
 * Returns the render_state to persist. Throws CanvasError for hard rejections
 * (oversize, malformed board) — those never produce a stored version.
 */

const MERMAID_DIAGRAM_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "requirementDiagram",
  "C4Context",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
];

/** Cheap, DOM-free mermaid pre-check: does it declare a known diagram type? */
export function mermaidRenderState(content: string): RenderState {
  const firstMeaningful = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("%%"));
  if (!firstMeaningful) return "render_error";
  const declared = MERMAID_DIAGRAM_KEYWORDS.some(
    (kw) => firstMeaningful === kw || firstMeaningful.startsWith(kw + " ") || firstMeaningful.startsWith(kw),
  );
  return declared ? "ok" : "render_error";
}

export interface ValidationOutcome {
  render_state: RenderState;
  content_size: number;
}

/**
 * Validate content for a given artifact type. Enforces the version size cap for
 * all types first (so oversize is always a rejection, never a stored truncation).
 */
export function validateContent(type: ArtifactType, content: string): ValidationOutcome {
  const size = byteLength(content);
  if (size > LIMITS.VERSION_CONTENT_BYTES) {
    throw CanvasError.oversize({
      limit: "VERSION_CONTENT_BYTES",
      limit_value: LIMITS.VERSION_CONTENT_BYTES,
      actual: size,
      unit: "bytes",
    });
  }

  switch (type) {
    case "markdown":
    case "html-static":
      return { render_state: "ok", content_size: size };
    case "mermaid":
      return { render_state: mermaidRenderState(content), content_size: size };
    case "board":
      try {
        parseBoardContent(content);
      } catch (e) {
        throw CanvasError.validation(
          `board content failed validation: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return { render_state: "ok", content_size: size };
  }
}
