import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  CanvasArtifactView,
  CanvasDataAdapter,
  CanvasTabView,
} from "@hermes/render";
import { CanvasShell } from "./CanvasShell";

/**
 * Canvas artifact-rail render smokes (PANES). Removal is soft-archive only
 * (plan §2.2), so the rail exposes a per-item archive control and an archived
 * recovery surface — but ONLY when the adapter supplies the matching capability.
 * These prove that gating and the accessible labelling, using
 * `renderToStaticMarkup` like the rest of the web-layer smokes (no DOM tooling).
 */

const TAB: CanvasTabView = { id: "tab_1", title: "Workspace", order: 0, status: "active", changedCount: 0 };

function artifact(id: string, title: string, status: "active" | "archived" = "active"): CanvasArtifactView {
  return { id, tabId: "tab_1", type: "markdown", title, status, headSeq: 1, changed: false };
}

const noopActions = {
  createTab: () => {},
  renameTab: () => {},
  reorderTab: () => {},
  archiveTab: () => {},
  selectTab: () => {},
  selectArtifact: () => {},
};

function adapterWith(overrides: Partial<CanvasDataAdapter>): CanvasDataAdapter {
  const active = [artifact("art_1", "First"), artifact("art_2", "Second")];
  return {
    tabs: [TAB],
    artifactsByTab: () => active,
    getArtifactContent: () => ({ status: "empty" }),
    actions: { ...noopActions },
    ...overrides,
  };
}

function render(adapter: CanvasDataAdapter): string {
  return renderToStaticMarkup(
    h(CanvasShell, { adapter, activeTabId: "tab_1", activeArtifactId: "art_1" }),
  );
}

describe("artifact rail archive control gating", () => {
  it("renders a labelled, hover-revealed archive × on each item when the adapter can archive", () => {
    const html = render(adapterWith({ actions: { ...noopActions, archiveArtifact: () => {} } }));
    expect(html).toContain('aria-label="Archive First"');
    expect(html).toContain('aria-label="Archive Second"');
    expect(html).toContain("hc-canvas__rail-item--archivable");
    // The inline confirm is state-gated — it must not be present on first render.
    expect(html).not.toContain("Archive “First”?");
  });

  it("omits the archive control entirely when the adapter cannot archive", () => {
    const html = render(adapterWith({}));
    expect(html).not.toContain('aria-label="Archive First"');
    expect(html).not.toContain("hc-canvas__rail-item--archivable");
    // Items still render as a plain picker.
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });
});

describe("artifact rail archived-recovery surface", () => {
  it("shows a 'Show archived (n)' toggle when there are archived items and the adapter can unarchive", () => {
    const html = render(
      adapterWith({
        archivedArtifactsByTab: () => [artifact("art_3", "Old", "archived")],
        actions: { ...noopActions, archiveArtifact: () => {}, unarchiveArtifact: () => {} },
      }),
    );
    expect(html).toContain("Show archived (1)");
  });

  it("hides the archived toggle when nothing is archived", () => {
    const html = render(
      adapterWith({
        archivedArtifactsByTab: () => [],
        actions: { ...noopActions, archiveArtifact: () => {}, unarchiveArtifact: () => {} },
      }),
    );
    expect(html).not.toContain("Show archived");
  });
});
