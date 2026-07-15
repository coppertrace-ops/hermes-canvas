"use client";

/**
 * Live canvas adapter (OWNER: PROOF integration).
 *
 * Convex-backed twin of useDemoCanvasAdapter. Also handles the common empty-tabs
 * / orphan-artifact case: agent-created artifacts often have no tab_id and the
 * tabs table may be empty, which previously left the UI on "No artifact selected"
 * with no picker.
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
import type { Id } from "../../convex/_generated/dataModel";

/** Synthetic tab id used when Convex has artifacts but zero tabs. */
export const WORKSPACE_TAB_ID = "__workspace__";

export interface ConvexCanvasAdapter {
  adapter: CanvasDataAdapter;
  activeTabId: string | null;
  activeArtifactId: string | null;
  loaded: boolean;
  artifactCount: number;
}

export function useConvexCanvasAdapter(): ConvexCanvasAdapter {
  const tabs = useQuery(api.canvas.listTabs, {});
  // Include archived so the rail's "show archived" recovery list has data; active
  // views filter on `status` below, so this widening is inert for them.
  const artifacts = useQuery(api.canvas.listArtifacts, { include_archived: true });
  const changes = useQuery(api.lastSeen.listArtifactChanges, {});
  const markSeenMut = useMutation(api.lastSeen.markSeen);
  const archiveArtifactMut = useMutation(api.canvas.archiveArtifactAsHuman);
  const unarchiveArtifactMut = useMutation(api.canvas.unarchiveArtifactAsHuman);
  const archiveTabMut = useMutation(api.canvas.archiveTabAsHuman);

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  const activeRead = useQuery(
    api.canvas.readArtifact,
    activeArtifactId ? { artifact_id: activeArtifactId } : "skip",
  );

  const changedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of changes?.artifacts ?? []) m.set(c.artifact_id, c.changed);
    return m;
  }, [changes]);

  const artifactViews = useMemo<CanvasArtifactView[]>(
    () =>
      (artifacts ?? []).map((a) => ({
        id: a.artifact_id,
        // Treat missing tab as workspace so orphans are visible.
        tabId: a.tab_id ?? WORKSPACE_TAB_ID,
        type: a.type,
        title: a.title,
        status: a.status,
        headSeq: a.head_seq,
        changed: changedMap.get(a.artifact_id) ?? false,
      })),
    [artifacts, changedMap],
  );

  const tabViews = useMemo<CanvasTabView[]>(() => {
    const counts = changes?.tabChangedCounts ?? {};
    const real = (tabs ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      status: t.status,
      changedCount: counts[t.id] ?? 0,
    }));
    if (real.length > 0) return real;
    // No tabs in Convex but we have artifacts → synthesize Workspace so the shell can select.
    if (artifactViews.some((a) => a.status === "active")) {
      return [
        {
          id: WORKSPACE_TAB_ID,
          title: "Workspace",
          order: 0,
          status: "active" as const,
          changedCount: artifactViews.filter((a) => a.changed).length,
        },
      ];
    }
    return [];
  }, [tabs, changes, artifactViews]);

  // Default selection once data arrives.
  useEffect(() => {
    if (artifacts === undefined || tabs === undefined) return;
    const activeTabs = tabViews.filter((t) => t.status === "active");
    if (activeTabId === null && activeTabs.length > 0) {
      const firstTab = activeTabs[0]!;
      setActiveTabId(firstTab.id);
      const firstArt =
        artifactViews.find((a) => a.status === "active" && a.tabId === firstTab.id) ??
        artifactViews.find((a) => a.status === "active");
      if (firstArt) setActiveArtifactId(firstArt.id);
      return;
    }
    // Tab selected but no artifact yet (e.g. new orphans arrived).
    if (activeTabId && activeArtifactId === null) {
      const firstArt =
        artifactViews.find((a) => a.status === "active" && a.tabId === activeTabId) ??
        artifactViews.find((a) => a.status === "active");
      if (firstArt) setActiveArtifactId(firstArt.id);
    }
  }, [tabs, artifacts, activeTabId, activeArtifactId, tabViews, artifactViews]);

  const selectTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const first =
        artifactViews.find((a) => a.tabId === tabId && a.status === "active") ??
        artifactViews.find((a) => a.status === "active");
      if (first) setActiveArtifactId(first.id);
      else setActiveArtifactId(null);
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

  // Removal is soft-archive (reversible, recorded) — never a hard delete.
  const archiveArtifact = useCallback(
    (artifactId: string) => {
      void archiveArtifactMut({ id: artifactId });
    },
    [archiveArtifactMut],
  );

  const unarchiveArtifact = useCallback(
    (artifactId: string) => {
      void unarchiveArtifactMut({ id: artifactId });
    },
    [unarchiveArtifactMut],
  );

  const archiveTab = useCallback(
    (tabId: string) => {
      // The synthetic Workspace tab isn't a real row; there's nothing to archive.
      if (tabId === WORKSPACE_TAB_ID) return;
      void archiveTabMut({ tab_id: tabId as Id<"tabs"> });
    },
    [archiveTabMut],
  );

  const getArtifactContent = useCallback(
    (artifactId: string): ArtifactContentState => {
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
      artifactsByTab: (tabId: string) => {
        const active = artifactViews.filter((a) => a.status === "active");
        // Workspace / synthetic tab: include orphans + explicit workspace members.
        if (tabId === WORKSPACE_TAB_ID) {
          return active.filter((a) => !a.tabId || a.tabId === WORKSPACE_TAB_ID);
        }
        // Real tab: own artifacts + still show orphans so nothing is invisible.
        const own = active.filter((a) => a.tabId === tabId);
        const orphans = active.filter((a) => a.tabId === WORKSPACE_TAB_ID);
        // If this is the only/first real tab, merge orphans so seed data is visible.
        const realTabCount = tabViews.filter((t) => t.id !== WORKSPACE_TAB_ID && t.status === "active").length;
        if (realTabCount <= 1) return [...own, ...orphans.filter((o) => !own.some((x) => x.id === o.id))];
        return own.length > 0 ? own : orphans;
      },
      archivedArtifactsByTab: (tabId: string) => {
        const arch = artifactViews.filter((a) => a.status === "archived");
        // Mirror artifactsByTab's orphan handling so archived orphans surface under Workspace.
        if (tabId === WORKSPACE_TAB_ID) {
          return arch.filter((a) => !a.tabId || a.tabId === WORKSPACE_TAB_ID);
        }
        return arch.filter((a) => a.tabId === tabId);
      },
      getArtifactContent,
      markSeen,
      actions: {
        createTab: () => {},
        renameTab: () => {},
        reorderTab: () => {},
        archiveTab,
        selectTab,
        selectArtifact,
        archiveArtifact,
        unarchiveArtifact,
      },
    }),
    [
      tabViews,
      artifactViews,
      getArtifactContent,
      markSeen,
      selectTab,
      selectArtifact,
      archiveTab,
      archiveArtifact,
      unarchiveArtifact,
    ],
  );

  return {
    adapter,
    activeTabId,
    activeArtifactId,
    loaded: artifacts !== undefined,
    // Active-artifact count only — an archived-only deployment must not read as "live".
    artifactCount: (artifacts ?? []).filter((a) => a.status === "active").length,
  };
}
