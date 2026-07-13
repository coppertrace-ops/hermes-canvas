import type { HtmlDiff } from "@hermes/diff";
import { cssVar, Text } from "@hermes/ui";
import type { CSSProperties, ReactNode } from "react";
import { SourceDiff } from "./SourceDiff";

/**
 * HTML-static diff (plan §3): "source diff + before/after sandboxed previews".
 *
 * The source diff is always shown. The before/after PREVIEWS require the
 * sandboxed content origin (plan §4/§5), which lands in Phase 5 AFTER this gate.
 * Rather than fake a preview by mounting HTML in the app origin (a stored-XSS
 * hazard, and dishonest), this view renders a preview *slot* that Phase 5 fills
 * with WARDEN's sandbox host. The slot honestly states it is pending, and carries
 * the version's render-error state so a failed artifact never looks blank.
 */

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: cssVar("space-4"),
};

const slot: CSSProperties = {
  border: `1px dashed ${cssVar("border-strong")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-4"),
  background: cssVar("surface-sunken"),
  minHeight: "6rem",
  display: "flex",
  flexDirection: "column",
  gap: cssVar("space-1"),
};

/**
 * Optional preview renderer injected by Phase 5 integration. When absent, the
 * honest "preview pending sandbox" placeholder shows. Keeps this component pure —
 * it never mounts an iframe itself.
 */
export type HtmlPreviewRenderer = (args: {
  html: string;
  renderError: boolean;
  side: "before" | "after";
}) => ReactNode;

function PreviewSlot({
  side,
  html,
  renderError,
  render,
}: {
  side: "before" | "after";
  html: string;
  renderError: boolean;
  render?: HtmlPreviewRenderer;
}) {
  return (
    <div style={slot}>
      <Text size="xs" tone="tertiary" weight="medium" mono>
        {side}
      </Text>
      {render ? (
        render({ html, renderError, side })
      ) : renderError ? (
        <Text size="sm" tone="danger">
          This version failed to render; its raw source is in the diff below.
        </Text>
      ) : (
        <Text size="sm" tone="tertiary">
          Live preview renders in the sandboxed content frame (enabled with the{" "}
          <code>html_artifacts</code> flag). Source changes are shown below.
        </Text>
      )}
    </div>
  );
}

export interface HtmlDiffViewProps {
  diff: HtmlDiff;
  /** Phase-5 sandbox host; when omitted, an honest pending placeholder shows. */
  renderPreview?: HtmlPreviewRenderer;
}

export function HtmlDiffView({ diff, renderPreview }: HtmlDiffViewProps) {
  return (
    <div className="hc-html-diff">
      <div style={grid}>
        <PreviewSlot
          side="before"
          html={diff.before.html}
          renderError={diff.before.renderError}
          render={renderPreview}
        />
        <PreviewSlot
          side="after"
          html={diff.after.html}
          renderError={diff.after.renderError}
          render={renderPreview}
        />
      </div>
      <div style={{ marginTop: cssVar("space-4") }}>
        <Text size="xs" tone="tertiary" weight="medium" mono>
          source diff
        </Text>
        <SourceDiff diff={diff.source} />
      </div>
    </div>
  );
}
