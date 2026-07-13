/**
 * HTML-static diff (plan §3): "source diff + before/after sandboxed previews".
 *
 * The engine stays pure: it never renders HTML (that is the sandboxed content
 * origin, plan §4). It produces the source line diff plus a preview *model* whose
 * `html` fields the `HtmlDiffView` hands to the sandbox host for the two previews.
 * Only the focused preview mounts a live iframe downstream (plan §4 perf rule);
 * this model just carries both sources and their render-error state.
 */

import { diffLines } from "./text";
import type { LineDiff } from "./text";

export interface HtmlPreviewSide {
  html: string;
  renderError: boolean;
}

export interface HtmlDiff {
  before: HtmlPreviewSide;
  after: HtmlPreviewSide;
  source: LineDiff;
  identical: boolean;
}

export interface HtmlDiffInput {
  before: string;
  after: string;
  beforeRenderError?: boolean;
  afterRenderError?: boolean;
}

export function diffHtml(input: HtmlDiffInput): HtmlDiff {
  const source = diffLines(input.before, input.after);
  return {
    before: { html: input.before, renderError: input.beforeRenderError ?? false },
    after: { html: input.after, renderError: input.afterRenderError ?? false },
    source,
    identical: source.identical,
  };
}
