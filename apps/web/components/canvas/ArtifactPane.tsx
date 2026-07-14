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
  ArtifactVersionView,
  MarkdownPolicy,
  MermaidEngine,
} from "@hermes/render";
import { useFlags } from "../flags";
import { HtmlArtifactHost } from "./HtmlArtifactHost";

/**
 * Artifact pane (PANES; plan §7). Renders the focused artifact's content by
 * type, wrapped in the honest empty/loading/error states. Markdown and Mermaid
 * are live since Phase 3. `html-static` mounts WARDEN's sandbox host behind the
 * server-side `html_artifacts` flag (Wave 2 P5); flag off ⇒ an honest disabled
 * state naming the flag, never a blank or a crash. `board` follows in P6 behind
 * its own flag.
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
        case "html-static":
          return <HtmlStaticBody artifact={artifact} version={version} />;
        case "board":
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

/**
 * `html-static` body — the flag seam for the P5 sandbox tile. The flag gates
 * RENDERING only (runbook §9): the stored content is untouched either way, and
 * a flip takes effect live via the `getFlags` subscription without a redeploy.
 */
function HtmlStaticBody({
  artifact,
  version,
}: {
  artifact: CanvasArtifactView;
  version: ArtifactVersionView;
}) {
  const { html_artifacts } = useFlags();
  if (!html_artifacts) {
    return (
      <ArtifactEmpty
        icon={null}
        title="HTML artifacts are disabled"
        description="The server-side html_artifacts flag is off. This artifact's source is stored and versioned; it renders in the sandboxed frame once the flag is enabled (owner-only, audited)."
      />
    );
  }
  return (
    <HtmlArtifactHost
      html={version.content}
      artifactId={artifact.id}
      seq={version.seq}
      title={`Sandboxed HTML artifact: ${artifact.title}`}
    />
  );
}
