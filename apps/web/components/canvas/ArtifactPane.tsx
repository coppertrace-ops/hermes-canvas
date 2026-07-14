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
import { parseBoardContent } from "@hermes/contract";
import { useFlags } from "../flags";
import { BoardView } from "../board";
import { HtmlArtifactHost } from "./HtmlArtifactHost";

/**
 * Artifact pane (PANES; plan §7). Renders the focused artifact's content by
 * type, wrapped in the honest empty/loading/error states. Markdown and Mermaid
 * are live since Phase 3. `html-static` mounts WARDEN's sandbox host behind the
 * server-side `html_artifacts` flag (Wave 2 P5); flag off ⇒ an honest disabled
 * state naming the flag, never a blank or a crash. `board` follows in P6 behind
 * its own flag.
 */
/**
 * Commit a human board edit (drag / card change) as one appended version.
 * `parentSeq` is the seq the edit was based on, so contention is detected in the
 * plan layer (plan §6). Omitted ⇒ the board renders read-only.
 */
export type EditBoardFn = (
  artifactId: string,
  parentSeq: number,
  nextContent: string,
  why: string,
) => void;

export interface ArtifactPaneProps {
  /** The focused artifact's summary, or null when nothing is selected. */
  artifact: CanvasArtifactView | null;
  /** Async content state from the data adapter. */
  content: ArtifactContentState;
  /** Injected Mermaid engine (integration/tests). Defaults to strict lazy load. */
  mermaidEngine?: MermaidEngine;
  /** Markdown sanitizer policy override (defaults to the strict plan §4 posture). */
  markdownPolicy?: MarkdownPolicy;
  /** Board edit commit (P6). Omitted ⇒ boards render read-only. */
  onEditBoard?: EditBoardFn;
  className?: string;
}

export function ArtifactPane({
  artifact,
  content,
  mermaidEngine,
  markdownPolicy,
  onEditBoard,
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
        onEditBoard={onEditBoard}
      />
    </Panel>
  );
}

function ArtifactBody({ artifact, content, mermaidEngine, markdownPolicy, onEditBoard }: ArtifactPaneProps) {
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
          return <BoardBody artifact={artifact} version={version} onEditBoard={onEditBoard} />;
      }
    }
  }
}

/**
 * `board` body — flag seam for the P6 Kanban surface. Flag gates RENDERING only;
 * stored board content is untouched. Malformed board JSON shows the parse error +
 * raw source (never a blank), matching the plan's "render_error is visible" rule.
 */
function BoardBody({
  artifact,
  version,
  onEditBoard,
}: {
  artifact: CanvasArtifactView;
  version: ArtifactVersionView;
  onEditBoard?: EditBoardFn;
}) {
  const { boards } = useFlags();
  if (!boards) {
    return (
      <ArtifactEmpty
        icon={null}
        title="Boards are disabled"
        description="The server-side boards flag is off. This board's content is stored and versioned; it renders once the flag is enabled (owner-only, audited)."
      />
    );
  }
  let board;
  try {
    board = parseBoardContent(version.content);
  } catch (e) {
    return (
      <ArtifactError message={`This board could not be parsed: ${e instanceof Error ? e.message : String(e)}`} />
    );
  }
  const onEdit = onEditBoard
    ? (nextContent: string, why: string) => onEditBoard(artifact.id, version.seq, nextContent, why)
    : undefined;
  return <BoardView board={board} onEdit={onEdit} />;
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
