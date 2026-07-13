/**
 * Mermaid diff (plan §3): "source diff + before/after renders side by side".
 *
 * The diff engine is pure and never renders Mermaid itself (that is PANES'
 * `@hermes/render` strict engine, run in the browser). This produces the source
 * line diff plus a *render model* the `MermaidDiffView` feeds to the renderer for
 * the two side-by-side panes — including the render-error state so a version that
 * failed to parse shows its error + raw source, never a blank pane (plan §2.2).
 */

import { diffLines } from "./text";
import type { LineDiff } from "./text";

/** One side of the before/after Mermaid comparison. */
export interface MermaidRenderSide {
  /** Raw mermaid source to hand to the strict renderer. */
  source: string;
  /**
   * Whether this version was stored with a parse/render error. When true the
   * view shows the error affordance + source instead of attempting a render.
   */
  renderError: boolean;
}

export interface MermaidDiff {
  before: MermaidRenderSide;
  after: MermaidRenderSide;
  /** Line-level source diff, always available as the textual view. */
  source: LineDiff;
  /** True when the two sources are byte-identical. */
  identical: boolean;
}

export interface MermaidDiffInput {
  before: string;
  after: string;
  /** `render_state === "render_error"` for each side, from the stored version. */
  beforeRenderError?: boolean;
  afterRenderError?: boolean;
}

export function diffMermaid(input: MermaidDiffInput): MermaidDiff {
  const source = diffLines(input.before, input.after);
  return {
    before: { source: input.before, renderError: input.beforeRenderError ?? false },
    after: { source: input.after, renderError: input.afterRenderError ?? false },
    source,
    identical: source.identical,
  };
}
