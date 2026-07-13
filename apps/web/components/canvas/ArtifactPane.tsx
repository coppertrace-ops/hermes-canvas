"use client";

import { Badge, Panel } from "@hermes/ui";
import {
  Markdown,
  Mermaid,
  ArtifactEmpty,
  ArtifactError,
  ArtifactLoading,
} from "@hermes/render";
import type {
  ArtifactContentState,
  CanvasArtifactView,
  MarkdownPolicy,
  MermaidEngine,
} from "@hermes/render";

/**
 * Artifact pane (PANES; plan §7). Renders the focused artifact's content by
 * type, wrapped in the honest empty/loading/error states. Markdown and Mermaid
 * are live in Phase 3; `board` and `html-static` are sequenced behind later
 * gates (P5/P6) and show a neutral "not available in this phase" state rather
 * than a blank or a crash.
 */
export interface ArtifactPaneProps {
  /** The focused artifact's summary, or null when nothing is selected. */
  artifact: CanvasArtifactView | null;
  /** Async content state from the data adapter. */
  content: ArtifactContentState;
  /** Injected Mermaid engine (integration/tests). Defaults to strict lazy load. */
  mermaidEngine?: MermaidEngine;
  /** Markdown sanitizer policy override (defaults to the strict plan §4 posture). */
  markdownPolicy?: MarkdownPolicy;
  className?: string;
}

export function ArtifactPane({
  artifact,
  content,
  mermaidEngine,
  markdownPolicy,
  className,
}: ArtifactPaneProps) {
  if (!artifact) {
    return (
      <Panel padding="none" className={className}>
        <ArtifactEmpty />
      </Panel>
    );
  }

  const contended =
    content.status === "ready" && content.version.contended ? (
      <Badge tone="warning" variant="subtle" size="sm" title="This version was written against a stale base">
        contended
      </Badge>
    ) : undefined;

  return (
    <Panel title={artifact.title} actions={contended} padding="md" className={className}>
      <ArtifactBody
        artifact={artifact}
        content={content}
        mermaidEngine={mermaidEngine}
        markdownPolicy={markdownPolicy}
      />
    </Panel>
  );
}

function ArtifactBody({ artifact, content, mermaidEngine, markdownPolicy }: ArtifactPaneProps) {
  if (!artifact) return <ArtifactEmpty />;

  switch (content.status) {
    case "loading":
      return <ArtifactLoading label={artifact.title} />;
    case "error":
      return <ArtifactError message={content.message} onRetry={content.retry} />;
    case "empty":
      return (
        <ArtifactEmpty
          title="Nothing to show yet"
          description="This artifact has no content at the selected version."
        />
      );
    case "ready": {
      const { version } = content;
      switch (artifact.type) {
        case "markdown":
          return <Markdown source={version.content} policy={markdownPolicy} />;
        case "mermaid":
          return (
            <Mermaid
              source={version.content}
              engine={mermaidEngine}
              serverRenderError={version.renderState === "render_error"}
            />
          );
        case "board":
        case "html-static":
          return (
            <ArtifactEmpty
              icon={null}
              title={`${artifact.type} artifacts aren't available yet`}
              description="This artifact type ships in a later phase, behind its feature flag."
            />
          );
      }
    }
  }
}
