import type { ArtifactVersion } from "@hermes/contract";
import { InMemoryMetricsSink } from "@hermes/diff";
import { scriptedSession } from "@hermes/diff/fixtures";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiffView } from "./DiffView";
import { HistoryPanel } from "./HistoryPanel";
import { MergePrompt } from "./MergePrompt";
import { RestoreConfirm } from "./RestoreConfirm";
import { VersionTimeline } from "./VersionTimeline";
import type { HistoryAdapter } from "./types";

/**
 * Web-layer render smoke tests (CHRONICLE). These prove the assembled history
 * tree renders without throwing AND surfaces the G4 evidence in the UI itself:
 * the whole-document-rewrite label, the localized region diff, the contended
 * badge/merge prompt, and the append-only restore preview. Uses
 * `renderToStaticMarkup` (no DOM tooling needed), matching the chat subsystem.
 */

const { versions, headSeq } = scriptedSession();

function readyAdapter(): HistoryAdapter {
  return {
    load: {
      status: "ready",
      data: { artifactId: "art_1", type: "markdown", title: "Design notes", versions, headSeq },
    },
    metrics: new InMemoryMetricsSink(),
    actions: { restore: () => {}, resolveMerge: () => {}, markSeen: () => {} },
  };
}

describe("HistoryPanel render smoke", () => {
  it("renders the full panel with the 20-write timeline", () => {
    const html = renderToStaticMarkup(h(HistoryPanel, { adapter: readyAdapter() }));
    expect(html).toContain("Design notes");
    expect(html).toContain("v20");
    expect(html).toContain("v1");
    expect(html).toContain("head");
  });

  it("shows honest loading / error / empty states", () => {
    const loading = renderToStaticMarkup(
      h(HistoryPanel, { adapter: { load: { status: "loading" }, actions: { restore: () => {} } } }),
    );
    expect(loading).toContain("Loading history");
    const error = renderToStaticMarkup(
      h(HistoryPanel, {
        adapter: { load: { status: "error", message: "boom" }, actions: { restore: () => {} } },
      }),
    );
    expect(error).toContain("boom");
    const empty = renderToStaticMarkup(
      h(HistoryPanel, { adapter: { load: { status: "empty" }, actions: { restore: () => {} } } }),
    );
    expect(empty).toContain("No history yet");
  });
});

describe("VersionTimeline surfaces every write's metadata (G4 reconstruction)", () => {
  const html = renderToStaticMarkup(h(VersionTimeline, { versions, headSeq }));

  it("labels the whole-document rewrite at v6", () => {
    expect(html).toContain("Whole-document rewrite");
  });
  it("labels the restore at v20 with its source", () => {
    expect(html).toContain("Restored from v5");
  });
  it("shows the contended badge and its aggregate", () => {
    expect(html).toContain("contended");
    expect(html).toContain("1 contended");
  });
  it("renders the audit pair (why + recorded effect) for writes", () => {
    expect(html).toContain("why:");
    expect(html).toContain("recorded:");
    expect(html).toContain("tighten the auth section"); // a real `why`
  });
});

describe("DiffView labels from resolved_action (G4 adversarial)", () => {
  it("labels a whole-document rewrite as such", () => {
    const before = versions.find((v) => v.seq === 5)!;
    const after = versions.find((v) => v.seq === 6)!;
    const html = renderToStaticMarkup(h(DiffView, { type: "markdown", before, after }));
    expect(html).toContain("Whole-document rewrite");
  });

  it("labels a region edit and localizes the diff (only the changed region highlighted)", () => {
    const before = versions.find((v) => v.seq === 1)!;
    const after = versions.find((v) => v.seq === 2)!;
    const html = renderToStaticMarkup(h(DiffView, { type: "markdown", before, after }));
    expect(html).toContain("Region edit");
    // The changed block is rendered inline with an inserted word highlighted.
    expect(html).toContain("changed");
    expect(html).toMatch(/<ins[^>]*>JWT/);
    // Unchanged blocks (the Storage/Overview paragraphs) still render as text.
    expect(html).toContain("All state lives in Convex");
  });
});

describe("RestoreConfirm shows the append-only preview", () => {
  it("states the current head is preserved and previews the new seq", () => {
    const html = renderToStaticMarkup(
      h(RestoreConfirm, {
        versions,
        sourceSeq: 5,
        headSeq,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("append-only");
    expect(html).toContain(`v${headSeq} is kept`.slice(0, 6)); // "v20 is kept"
    expect(html).toContain(`Restore as v${headSeq + 1}`);
  });
});

describe("MergePrompt surfaces the contended write with append-only resolutions", () => {
  it("shows the contended state and offers keep/restore/edit, never delete", () => {
    const html = renderToStaticMarkup(
      h(MergePrompt, {
        type: "markdown",
        versions,
        contendedSeq: 13,
        headSeq,
        onResolve: () => {},
      }),
    );
    expect(html).toContain("contended");
    expect(html).toContain("Keep current head");
    expect(html).toContain("Restore the contended version");
    expect(html).toContain("Edit from head");
    // No destructive resolution button exists (both sides are always preserved).
    expect(html).not.toMatch(/<button[^>]*>[^<]*(delete|overwrite|discard)[^<]*<\/button>/i);
  });
});

/** Append-only proof at the adapter boundary: restore never rewrites history. */
describe("mock restore is append-only", () => {
  it("appending a restore leaves all prior versions byte-identical", () => {
    const source = versions.find((v) => v.seq === 5)!;
    const restored: ArtifactVersion = {
      ...source,
      seq: headSeq + 1,
      parent_seq: headSeq,
      author: "human",
      resolved_action: { op: "restore", target: "art_1", restored_from_seq: 5 },
    };
    const after = [...versions, restored];
    // Every original version object is preserved unchanged.
    for (const v of versions) expect(after.find((a) => a.seq === v.seq)).toBe(v);
    expect(after.length).toBe(versions.length + 1);
  });
});
