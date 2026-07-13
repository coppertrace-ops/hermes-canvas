import type { ArtifactType, ArtifactVersion } from "@hermes/contract";
import { diffArtifact, diffLines } from "@hermes/diff";
import type { ArtifactDiff } from "@hermes/diff";
import { Badge, Button, cssVar, Text } from "@hermes/ui";
import { useMemo, useState } from "react";
import { BoardDiffView } from "./BoardDiffView";
import { HtmlDiffView } from "./HtmlDiffView";
import type { HtmlPreviewRenderer } from "./HtmlDiffView";
import { MarkdownDiffView } from "./MarkdownDiffView";
import { MermaidDiffView } from "./MermaidDiffView";
import { SourceDiff } from "./SourceDiff";

/**
 * Diff dispatcher (plan §3). Builds the type-appropriate `ArtifactDiff` from two
 * versions and renders it. Markdown and board expose a rendered↔source toggle
 * (rendered is primary; raw source is the fallback, per plan §3). Mermaid and
 * HTML embed their own source diff beneath the before/after panes.
 *
 * The header label comes straight from the server-recorded `resolved_action` (via
 * `diffArtifact`), so a whole-document rewrite is labelled as such and a region
 * edit names its region — the diff never re-infers what actually happened.
 */

export type DiffMode = "rendered" | "source";

export interface DiffViewProps {
  type: ArtifactType;
  /** The earlier version; null for the create version (everything inserted). */
  before: ArtifactVersion | null;
  after: ArtifactVersion;
  /** Phase-5 sandbox host for HTML previews (optional). */
  renderHtmlPreview?: HtmlPreviewRenderer;
  /** Hide the built-in header (when a caller supplies its own). */
  hideHeader?: boolean;
}

const supportsToggle = (type: ArtifactType) => type === "markdown" || type === "board";

export function DiffView({ type, before, after, renderHtmlPreview, hideHeader }: DiffViewProps) {
  const [mode, setMode] = useState<DiffMode>("rendered");
  const diff: ArtifactDiff = useMemo(
    () =>
      diffArtifact(
        type,
        before
          ? {
              seq: before.seq,
              content: before.content,
              renderState: before.render_state,
              resolvedAction: before.resolved_action,
            }
          : null,
        {
          seq: after.seq,
          content: after.content,
          renderState: after.render_state,
          resolvedAction: after.resolved_action,
        },
      ),
    [type, before, after],
  );

  const beforeContent = before?.content ?? "";

  return (
    <div className="hc-diff-view">
      {!hideHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: cssVar("space-2"),
            marginBottom: cssVar("space-3"),
          }}
        >
          <Badge
            tone={
              diff.header.scope === "replace_all"
                ? "warning"
                : diff.header.scope === "restore"
                  ? "accent"
                  : "neutral"
            }
            size="sm"
            variant="subtle"
          >
            {diff.header.label}
          </Badge>
          <Text as="span" size="sm" tone="tertiary" mono>
            {before ? `v${before.seq} → v${after.seq}` : `v${after.seq} (created)`}
          </Text>
          {supportsToggle(type) && (
            <div style={{ marginLeft: "auto", display: "flex", gap: cssVar("space-1") }}>
              <Button
                size="sm"
                variant={mode === "rendered" ? "primary" : "ghost"}
                onClick={() => setMode("rendered")}
              >
                Rendered
              </Button>
              <Button
                size="sm"
                variant={mode === "source" ? "primary" : "ghost"}
                onClick={() => setMode("source")}
              >
                Source
              </Button>
            </div>
          )}
        </div>
      )}

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (diff.body.kind === "board-fallback") {
      return (
        <div>
          <Text size="sm" tone="danger" style={{ marginBottom: cssVar("space-2") }}>
            {`Board content could not be parsed (${diff.body.error}); showing a raw source diff.`}
          </Text>
          <SourceDiff diff={diff.body.diff} />
        </div>
      );
    }
    switch (diff.body.kind) {
      case "markdown":
        return mode === "source" ? (
          <SourceDiff diff={diffLines(beforeContent, after.content)} />
        ) : (
          <MarkdownDiffView diff={diff.body.diff} />
        );
      case "board":
        return mode === "source" ? (
          <SourceDiff diff={diffLines(beforeContent, after.content)} />
        ) : (
          <BoardDiffView diff={diff.body.diff} />
        );
      case "mermaid":
        return <MermaidDiffView diff={diff.body.diff} />;
      case "html-static":
        return <HtmlDiffView diff={diff.body.diff} renderPreview={renderHtmlPreview} />;
    }
  }
}
