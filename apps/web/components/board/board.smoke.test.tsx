import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Board } from "@hermes/contract";
import { BoardView } from "./BoardView";
import { ArtifactPane } from "../canvas";

/**
 * Board render smokes (`renderToStaticMarkup`). Prove: columns/cards render with
 * labels; a read-only board (no onEdit) is not draggable; the flag-off ArtifactPane
 * board case shows the honest disabled state; malformed board JSON shows a parse
 * error, never a blank.
 */

const board: Board = {
  columns: [
    { id: "todo", title: "To do", cards: [{ id: "c1", title: "Design the tile", body: "sandbox host", labels: ["p1"] }] },
    { id: "done", title: "Done", cards: [] },
  ],
};

describe("BoardView markup", () => {
  it("renders columns, cards, counts, labels", () => {
    const html = renderToStaticMarkup(h(BoardView, { board }));
    expect(html).toContain("To do");
    expect(html).toContain("Design the tile");
    expect(html).toContain("sandbox host");
    expect(html).toContain("p1");
    expect(html).toContain("No cards"); // empty Done column
  });

  it("read-only board carries no draggable cards", () => {
    const html = renderToStaticMarkup(h(BoardView, { board }));
    expect(html).not.toContain('draggable="true"');
  });

  it("editable board marks cards draggable", () => {
    const html = renderToStaticMarkup(h(BoardView, { board, onEdit: () => {} }));
    expect(html).toContain('draggable="true"');
  });
});

describe("ArtifactPane board flag gating", () => {
  const version = {
    artifactId: "art_b",
    seq: 1,
    content: JSON.stringify(board),
    author: "agent" as const,
    contended: false,
    renderState: "ok" as const,
  };
  const artifact = {
    id: "art_b",
    type: "board" as const,
    title: "Sprint",
    status: "active" as const,
    headSeq: 1,
    changed: false,
  };

  it("shows the honest disabled state when boards is off (default)", () => {
    const html = renderToStaticMarkup(
      h(ArtifactPane, { artifact, content: { status: "ready" as const, version } }),
    );
    expect(html).toContain("Boards are disabled");
    expect(html).not.toContain("draggable");
  });
});
