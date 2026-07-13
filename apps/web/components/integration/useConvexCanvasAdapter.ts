"use client";

/**
 * Live canvas adapter (OWNER: PROOF integration).
 *
 * The Convex-backed twin of {@link useDemoCanvasAdapter}: it satisfies the exact
 * same {@link CanvasDataAdapter} seam, so the PANES `CanvasShell` renders against
 * it with zero changes. It subscribes to the public LEDGER/CHRONICLE live queries
 * (`listTabs`, `listArtifacts`, `readArtifact`, `lastSeen.listArtifactChanges`)
 * and clears badges through the `lastSeen.markSeen` mutation. Only the active
 * artifact's content is subscribed — the shell only ever renders that one.
 *
 * Tab lifecycle (create/rename/reorder/archive) has no public human mutation yet
 * (those are agent-only `internalMutation`s), so those actions are honest no-ops
 * here, exactly as in the demo adapter — selection is the real wired behaviour.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type {
  ArtifactContentState,
  CanvasArtifactView,
  CanvasDataAdapter,
  CanvasTabView,
} from "@hermes/render";
import { api } from "../../convex/_generated/api";

export interface ConvexCanvasAdapter {
  adapter: CanvasDataAdapter;
  activeTabId: string | null;
  activeArtifactId: string | null;
  /** False while the artifact list query is still resolving (`undefined`). */
  loaded: boolean;
  /** Number of active artifacts — `0` means there is no live canvas data yet. */
  artifactCount: number;
}

export function useConvexCanvasAdapter(): ConvexCanvasAdapter {
  const tabs = useQuery(api.canvas.listTabs, {});
  const artifacts = useQuery(api.canvas.listArtifacts, {});
  const changes = useQuery(api.lastSeen.listArtifactChanges, {});
  const markSeenMut = useMutation(api.lastSeen.markSeen);

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  // Content of the active artifact only — the shell renders exactly one pane.
  const activeRead = useQuery(
    api.canvas.readArtifact,
    activeArtifactId ? { artifact_id: activeArtifactId } : "skip",
  );

  // Default selection once data arrives: first tab, first artifact within it.
  useEffect(() => {
    if (!tabs || !artifacts) return;
    if (activeTabId === null && tabs.length > 0) {
      const firstTab = tabs[0]!;
      setActiveTabId(firstTab.id);
      const firstArt = artifacts.find((a) => a.tab_id === firstTab.id);
      if (firstArt) setActiveArtifactId(firstArt.artifact_id);
    }
  }, [tabs, artifacts, activeTabId]);

  const changedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of changes?.artifacts ?? []) m.set(c.artifact_id, c.changed);
    return m;
  }, [changes]);

  const tabViews = useMemo<CanvasTabView[]>(() => {
    const counts = changes?.tabChangedCounts ?? {};
    return (tabs ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      status: t.status,
      changedCount: counts[t.id] ?? 0,
    }));
  }, [tabs, changes]);

  const artifactViews = useMemo<CanvasArtifactView[]>(
    () =>
      (artifacts ?? []).map((a) => ({
        id: a.artifact_id,
        tabId: a.tab_id,
        type: a.type,
        title: a.title,
        status: a.status,
        headSeq: a.head_seq,
        changed: changedMap.get(a.artifact_id) ?? false,
      })),
    [artifacts, changedMap],
  );

  const selectTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const first = artifactViews.find((a) => a.tabId === tabId && a.status === "active");
      if (first) setActiveArtifactId(first.id);
    },
    [artifactViews],
  );

  const selectArtifact = useCallback((artifactId: string) => {
    setActiveArtifactId(artifactId);
  }, []);

  const markSeen = useCallback(
    (artifactId: string) => {
      void markSeenMut({ artifact_id: artifactId });
    },
    [markSeenMut],
  );

  const getArtifactContent = useCallback(
    (artifactId: string): ArtifactContentState => {
      // Only the active artifact is subscribed; anything else is not yet loaded.
      if (artifactId !== activeArtifactId) return { status: "loading" };
      if (activeRead === undefined) return { status: "loading" };
      if (activeRead === null) return { status: "empty" };
      const v = activeRead.version;
      return {
        status: "ready",
        version: {
          artifactId: v.artifact_id,
          seq: v.seq,
          content: v.content,
          author: v.author,
          why: v.why,
          contended: v.contended,
          renderState: v.render_state,
        },
      };
    },
    [activeArtifactId, activeRead],
  );

  const adapter = useMemo<CanvasDataAdapter>(
    () => ({
      tabs: tabViews.filter((t) => t.status === "active"),
      artifactsByTab: (tabId: string) =>
        artifactViews.filter((a) => a.tabId === tabId && a.status === "active"),
      getArtifactContent,
      markSeen,
      actions: {
        // No public human mutation for tab lifecycle yet (agent-only internal
        // mutations); honest no-ops, matching the demo adapter.
        createTab: () => {},
        renameTab: () => {},
        reorderTab: () => {},
        archiveTab: () => {},
        selectTab,
        selectArtifact,
      },
    }),
    [tabViews, artifactViews, getArtifactContent, markSeen, selectTab, selectArtifact],
  );

  return {
    adapter,
    activeTabId,
    activeArtifactId,
    loaded: artifacts !== undefined,
    artifactCount: artifacts?.length ?? 0,
  };
}
