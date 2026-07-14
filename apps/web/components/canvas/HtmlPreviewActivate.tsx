"use client";

/**
 * Click-to-activate sandbox preview for history diffs (PANES; WP5).
 *
 * `HtmlDiffView` renders a before/after preview *slot* and injects rendering via
 * `HtmlPreviewRenderer`. Live iframes are disproportionately heavy (plan §4
 * performance rule), and a diff mounts TWO of them — so previews never mount
 * automatically. Each slot shows an explicit "Activate preview" affordance and
 * mounts the real `HtmlArtifactHost` only on click.
 *
 * `useHtmlPreviewRenderer` is the flag seam: it returns a renderer only when
 * `html_artifacts` is on, so a flagged-off (or demo) session keeps the honest
 * "enabled with the html_artifacts flag" placeholder that `HtmlDiffView` shows
 * when no renderer is supplied.
 */

import { useMemo, useState } from "react";
import { Button, cssVar, Text } from "@hermes/ui";
import type { HtmlPreviewRenderer } from "../history";
import { useFlags } from "../flags";
import { HtmlArtifactHost } from "./HtmlArtifactHost";

export interface HtmlPreviewActivateProps {
  html: string;
  renderError: boolean;
  side: "before" | "after";
}

export function HtmlPreviewActivate({ html, renderError, side }: HtmlPreviewActivateProps) {
  const [active, setActive] = useState(false);

  if (renderError) {
    return (
      <Text size="sm" tone="danger">
        This version failed to render; its raw source is in the diff below.
      </Text>
    );
  }
  if (!active) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-2") }}>
        <Text size="sm" tone="tertiary">
          Previews render in the sandboxed content frame on demand.
        </Text>
        <div>
          <Button size="sm" variant="ghost" onClick={() => setActive(true)}>
            Activate {side} preview
          </Button>
        </div>
      </div>
    );
  }
  return (
    <HtmlArtifactHost
      html={html}
      artifactId={`history-preview-${side}`}
      seq={0}
      title={`Sandboxed ${side} preview`}
    />
  );
}

/** Flag-gated preview renderer for `HistoryPanel`/`HtmlDiffView` injection. */
export function useHtmlPreviewRenderer(): HtmlPreviewRenderer | undefined {
  const { html_artifacts } = useFlags();
  return useMemo<HtmlPreviewRenderer | undefined>(() => {
    if (!html_artifacts) return undefined;
    const render: HtmlPreviewRenderer = ({ html, renderError, side }) => (
      <HtmlPreviewActivate html={html} renderError={renderError} side={side} />
    );
    return render;
  }, [html_artifacts]);
}
