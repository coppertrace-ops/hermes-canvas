"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ChangedBadge } from "@hermes/render";
import type {
  CanvasArtifactView,
  CanvasDataAdapter,
  MarkdownPolicy,
  MermaidEngine,
} from "@hermes/render";
import { Button, CloseIcon, IconButton, RotateCcwIcon } from "@hermes/ui";
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
 *
 * Removal is SOFT-ARCHIVE only (plan §2.2 — reversible, recorded, never a hard
 * delete). When the adapter supplies `actions.archiveArtifact`, each rail item
 * gains a hover/focus-revealed × (matching the tab bar's control pattern); it
 * asks a lightweight inline confirm, then archives. An "Undo" affordance and a
 * "show archived" recovery list (both driven by `actions.unarchiveArtifact`) make
 * the reversal one click away.
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

  const canArchive = typeof actions.archiveArtifact === "function";
  const canUnarchive = typeof actions.unarchiveArtifact === "function";
  const archived: CanvasArtifactView[] =
    activeTabId && adapter.archivedArtifactsByTab ? adapter.archivedArtifactsByTab(activeTabId) : [];

  // Inline-confirm target and the transient "Archived — Undo" affordance.
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);
  const [justArchived, setJustArchived] = useState<{ id: string; title: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Focusing an artifact marks it seen (plan §3 changed-since-last-looked).
  useEffect(() => {
    if (activeArtifact && markSeen) markSeen(activeArtifact.id);
  }, [activeArtifact, markSeen]);

  // The undo affordance is transient — clear it after a beat so the rail settles.
  useEffect(() => {
    if (!justArchived) return;
    const timer = setTimeout(() => setJustArchived(null), 6000);
    return () => clearTimeout(timer);
  }, [justArchived]);

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

  const commitArchive = (artifact: CanvasArtifactView) => {
    setConfirmingArchiveId(null);
    // Move focus off the artifact being archived BEFORE it leaves the list, so
    // the pane never lands on a stale (now-archived) selection.
    if (activeArtifact?.id === artifact.id) {
      const next = artifacts.find((a) => a.id !== artifact.id);
      if (next) actions.selectArtifact(next.id);
    }
    actions.archiveArtifact?.(artifact.id);
    setJustArchived({ id: artifact.id, title: artifact.title });
  };

  const undoArchive = () => {
    if (!justArchived) return;
    actions.unarchiveArtifact?.(justArchived.id);
    actions.selectArtifact(justArchived.id);
    setJustArchived(null);
  };

  const restoreArchived = (artifact: CanvasArtifactView) => {
    actions.unarchiveArtifact?.(artifact.id);
    actions.selectArtifact(artifact.id);
    if (justArchived?.id === artifact.id) setJustArchived(null);
  };

  const showRail = artifacts.length > 0 || archived.length > 0 || justArchived !== null;

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
      {showRail && (
        <div className="hc-canvas__rail">
          <div className="hc-canvas__rail-tabs" role="tablist" aria-label="Artifacts in this tab">
            {artifacts.map((artifact) =>
              confirmingArchiveId === artifact.id ? (
                <div
                  key={artifact.id}
                  className="hc-canvas__rail-item hc-canvas__rail-item--confirming"
                  role="group"
                  aria-label={`Archive ${artifact.title}?`}
                >
                  <span className="hc-canvas__rail-title">Archive “{artifact.title}”?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingArchiveId(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => commitArchive(artifact)}>
                    Archive
                  </Button>
                </div>
              ) : (
                <div key={artifact.id} className="hc-canvas__rail-slot">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={artifact.id === activeArtifact?.id}
                    className={
                      canArchive
                        ? "hc-canvas__rail-item hc-canvas__rail-item--archivable"
                        : "hc-canvas__rail-item"
                    }
                    onClick={() => actions.selectArtifact(artifact.id)}
                  >
                    <span className="hc-canvas__rail-title">{artifact.title}</span>
                    {artifact.changed && <ChangedBadge count={1} dot label={artifact.title} />}
                  </button>
                  {canArchive && (
                    <span className="hc-canvas__rail-controls">
                      <IconButton
                        label={`Archive ${artifact.title}`}
                        size="sm"
                        onClick={() => setConfirmingArchiveId(artifact.id)}
                      >
                        <CloseIcon />
                      </IconButton>
                    </span>
                  )}
                </div>
              ),
            )}
          </div>

          {justArchived && (
            <div className="hc-canvas__rail-undo" role="status">
              <span className="hc-canvas__rail-undo-text">Archived “{justArchived.title}”</span>
              {canUnarchive && (
                <Button variant="ghost" size="sm" onClick={undoArchive}>
                  Undo
                </Button>
              )}
            </div>
          )}

          {canUnarchive && archived.length > 0 && (
            <button
              type="button"
              className="hc-canvas__rail-toggle"
              aria-expanded={showArchived}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
            </button>
          )}

          {canUnarchive &&
            showArchived &&
            archived.map((artifact) => (
              <div
                key={artifact.id}
                className="hc-canvas__rail-item hc-canvas__rail-item--archived"
              >
                <span className="hc-canvas__rail-title">{artifact.title}</span>
                <IconButton
                  label={`Restore ${artifact.title}`}
                  size="sm"
                  onClick={() => restoreArchived(artifact)}
                >
                  <RotateCcwIcon />
                </IconButton>
              </div>
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
