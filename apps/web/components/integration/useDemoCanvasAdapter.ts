"use client";

/**
 * Demo canvas adapter (OWNER: PROOF integration).
 *
 * A concrete {@link CanvasDataAdapter} over local React state — the same seam the
 * Convex-backed adapter implements. It proves the integration is real: the PANES
 * `CanvasShell` renders identically against this and against live state. Tab and
 * artifact selection are lifted so the shell stays a pure view; `markSeen` clears
 * the changed badge (idempotently, so the shell's focus effect can't loop).
 */

import { useCallback, useMemo, useState } from "react";
import type { ArtifactContentState, CanvasDataAdapter } from "@hermes/render";
import { buildDemoSeed, type DemoArtifact, type DemoTab } from "./demoSeed";

export interface DemoCanvasAdapter {
  adapter: CanvasDataAdapter;
  activeTabId: string;
  activeArtifactId: string;
}

export function useDemoCanvasAdapter(): DemoCanvasAdapter {
  const seed = useMemo(() => buildDemoSeed(), []);
  const [tabs] = useState<DemoTab[]>(seed.tabs);
  const [artifacts, setArtifacts] = useState<DemoArtifact[]>(seed.artifacts);
  const [activeTabId, setActiveTabId] = useState<string>(seed.initialTabId);
  const [activeArtifactId, setActiveArtifactId] = useState<string>(seed.initialArtifactId);

  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setArtifacts((prev) => {
      const first = prev.find((a) => a.tabId === tabId && a.status === "active");
      if (first) setActiveArtifactId(first.id);
      return prev;
    });
  }, []);

  const selectArtifact = useCallback((artifactId: string) => {
    setActiveArtifactId(artifactId);
  }, []);

  // Clear the changed badge. Idempotent: if nothing changes we return the same
  // array reference so React bails out (the shell marks-seen in an effect).
  const markSeen = useCallback((artifactId: string) => {
    setArtifacts((prev) => {
      let touched = false;
      const next = prev.map((a) => {
        if (a.id === artifactId && a.changed) {
          touched = true;
          return { ...a, changed: false };
        }
        return a;
      });
      return touched ? next : prev;
    });
  }, []);

  // Soft-archive is reversible — flip status in local state; the shell handles
  // moving focus off an archived artifact via selectArtifact.
  const setStatus = useCallback((artifactId: string, status: "active" | "archived") => {
    setArtifacts((prev) => {
      let touched = false;
      const next = prev.map((a) => {
        if (a.id === artifactId && a.status !== status) {
          touched = true;
          return { ...a, status };
        }
        return a;
      });
      return touched ? next : prev;
    });
  }, []);

  const archiveArtifact = useCallback((id: string) => setStatus(id, "archived"), [setStatus]);
  const unarchiveArtifact = useCallback((id: string) => setStatus(id, "active"), [setStatus]);

  const adapter = useMemo<CanvasDataAdapter>(() => {
    const changedByTab = (tabId: string) =>
      artifacts.filter((a) => a.tabId === tabId && a.status === "active" && a.changed).length;

    return {
      tabs: tabs
        .filter((t) => t.status === "active")
        .map((t) => ({ ...t, changedCount: changedByTab(t.id) })),
      artifactsByTab: (tabId: string) =>
        artifacts.filter((a) => a.tabId === tabId && a.status === "active"),
      archivedArtifactsByTab: (tabId: string) =>
        artifacts.filter((a) => a.tabId === tabId && a.status === "archived"),
      getArtifactContent: (artifactId: string): ArtifactContentState => {
        const a = artifacts.find((x) => x.id === artifactId);
        if (!a) return { status: "empty" };
        return {
          status: "ready",
          version: {
            artifactId: a.id,
            seq: a.headSeq,
            content: a.content.content,
            author: a.content.author,
            why: a.content.why,
            contended: a.content.contended,
            renderState: a.content.renderState,
          },
        };
      },
      markSeen,
      actions: {
        // Tab lifecycle is out of scope for the read-only demo seed; the seam is
        // exercised for real by the Convex adapter. These are safe no-ops that
        // still satisfy the interface (selection is wired below).
        createTab: () => {},
        renameTab: () => {},
        reorderTab: () => {},
        archiveTab: () => {},
        selectTab,
        selectArtifact,
        archiveArtifact,
        unarchiveArtifact,
      },
    };
  }, [tabs, artifacts, markSeen, selectTab, selectArtifact, archiveArtifact, unarchiveArtifact]);

  return { adapter, activeTabId, activeArtifactId };
}
