import type { MermaidDiff } from "@hermes/diff";
import { Mermaid } from "@hermes/render";
import { cssVar, Text } from "@hermes/ui";
import type { CSSProperties } from "react";
import { SourceDiff } from "./SourceDiff";

/**
 * Mermaid diff (plan §3): "source diff + before/after renders side by side". The
 * two panes render through the strict `@hermes/render` engine; a version stored
 * with a render error shows the error + raw source there (never a blank pane).
 * The source diff sits beneath so textual changes are always legible even when a
 * diagram fails to render.
 */

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: cssVar("space-4"),
  alignItems: "start",
};

const pane: CSSProperties = {
  border: `1px solid ${cssVar("border")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-3"),
  minWidth: 0,
  overflow: "auto",
};

export interface MermaidDiffViewProps {
  diff: MermaidDiff;
}

export function MermaidDiffView({ diff }: MermaidDiffViewProps) {
  return (
    <div className="hc-mermaid-diff">
      <div style={grid}>
        <div style={pane}>
          <Text size="xs" tone="tertiary" weight="medium" mono>
            before
          </Text>
          <Mermaid source={diff.before.source} serverRenderError={diff.before.renderError} />
        </div>
        <div style={pane}>
          <Text size="xs" tone="tertiary" weight="medium" mono>
            after
          </Text>
          <Mermaid source={diff.after.source} serverRenderError={diff.after.renderError} />
        </div>
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
