"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { ChangedBadge } from "@hermes/render";
import type {
  CanvasArtifactView,
  CanvasDataAdapter,
  MarkdownPolicy,
  MermaidEngine,
} from "@hermes/render";
import { TabBar } from "./TabBar";
import { ArtifactPane } from "./ArtifactPane";
import type { EditBoardFn } from "./ArtifactPane";

/**
 * Canvas shell (PANES; plan §7). Composes the {@link TabBar}, an optional
 * per-tab artifact rail, and the {@link ArtifactPane} against a
 * {@link CanvasDataAdapter} — the seam later integration backs with Convex live
 * state. Selection is controlled by the parent so the shell stays a pure view.
 *
 * Resizable-pane-ready: the shell fills its container (`height: 100%`, column
 * flex) and takes `className`/`style`, so it drops straight into the primary or
 * secondary slot of `@hermes/render`'s `SplitPane` without further wiring.
 *
 * Focusing an artifact marks it seen (plan §3, clears the changed badge) via the
 * adapter's optional `markSeen`.
 */
export interface CanvasShellProps {
  adapter: CanvasDataAdapter;
  activeTabId: string | null;
  activeArtifactId: string | null;
  mermaidEngine?: MermaidEngine;
  markdownPolicy?: MarkdownPolicy;
  /** Human board-edit commit (P6). Omitted ⇒ boards render read-only. */
  onEditBoard?: EditBoardFn;
  className?: string;
  style?: CSSProperties;
}

export function CanvasShell({
  adapter,
  activeTabId,
  activeArtifactId,
  mermaidEngine,
  markdownPolicy,
  onEditBoard,
  className,
  style,
}: CanvasShellProps) {
  const { actions, markSeen } = adapter;

  const artifacts: CanvasArtifactView[] = activeTabId ? adapter.artifactsByTab(activeTabId) : [];
  const activeArtifact =
    artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0] ?? null;

  // Focusing an artifact marks it seen (plan §3 changed-since-last-looked).
  useEffect(() => {
    if (activeArtifact && markSeen) markSeen(activeArtifact.id);
  }, [activeArtifact, markSeen]);

  const content = activeArtifact
    ? adapter.getArtifactContent(activeArtifact.id)
    : ({ status: "empty" } as const);

  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    ...style,
  };

  return (
    <section
      className={className ? `hc-canvas ${className}` : "hc-canvas"}
      style={rootStyle}
      aria-label="Canvas"
    >
      <TabBar
        tabs={adapter.tabs}
        activeTabId={activeTabId}
        onSelectTab={actions.selectTab}
        onCreateTab={actions.createTab}
        onRenameTab={actions.renameTab}
        onReorderTab={actions.reorderTab}
        onArchiveTab={actions.archiveTab}
      />

      {/* Always show a picker when there is at least one artifact — previously
          hidden until length > 1, so a single artifact (or orphans) left users
          stuck on "No artifact selected" with no way to choose. */}
      {artifacts.length > 0 && (
        <div className="hc-canvas__rail" role="tablist" aria-label="Artifacts in this tab">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              role="tab"
              aria-selected={artifact.id === activeArtifact?.id}
              className="hc-canvas__rail-item"
              onClick={() => actions.selectArtifact(artifact.id)}
            >
              <span className="hc-canvas__rail-title">{artifact.title}</span>
              {artifact.changed && <ChangedBadge count={1} dot label={artifact.title} />}
            </button>
          ))}
        </div>
      )}

      <div className="hc-canvas__body" style={{ flex: "1 1 0%", minHeight: 0, overflow: "auto" }}>
        <ArtifactPane
          artifact={activeArtifact}
          content={content}
          mermaidEngine={mermaidEngine}
          markdownPolicy={markdownPolicy}
          onEditBoard={onEditBoard}
        />
      </div>
    </section>
  );
}
