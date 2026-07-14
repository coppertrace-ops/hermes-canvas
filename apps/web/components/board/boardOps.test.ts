import { diffBoard } from "@hermes/diff";
import { describe, expect, it } from "vitest";
import type { Board } from "@hermes/contract";
import { boardsEqual, findCard, moveCard, serializeBoard } from "./boardOps";

/**
 * Pure board-op specs (WP7). Prove drag math is correct and — crucially — that a
 * move reads back through `@hermes/diff`'s semantic diff as a MOVE (not
 * remove+add), which is the whole point of card-identity boards (plan §6).
 */

function board(): Board {
  return {
    columns: [
      { id: "todo", title: "To do", cards: [
        { id: "c1", title: "First", body: "", labels: [] },
        { id: "c2", title: "Second", body: "", labels: [] },
      ] },
      { id: "doing", title: "Doing", cards: [
        { id: "c3", title: "Third", body: "", labels: [] },
      ] },
      { id: "done", title: "Done", cards: [] },
    ],
  };
}

describe("findCard", () => {
  it("locates a card by id across columns", () => {
    expect(findCard(board(), "c3")).toEqual({ col: 1, idx: 0 });
    expect(findCard(board(), "nope")).toBeNull();
  });
});

describe("moveCard — cross-column", () => {
  it("moves a card to another column and leaves the source without it", () => {
    const next = moveCard(board(), "c1", "done", 0);
    expect(next.columns[0]!.cards.map((c) => c.id)).toEqual(["c2"]);
    expect(next.columns[2]!.cards.map((c) => c.id)).toEqual(["c1"]);
  });

  it("reads back as a single MOVE through the semantic diff", () => {
    const before = serializeBoard(board());
    const after = serializeBoard(moveCard(board(), "c1", "doing", 1));
    const d = diffBoard(before, after);
    expect(d.movedCards).toBe(1);
    expect(d.addedCards).toBe(0);
    expect(d.removedCards).toBe(0);
    const moved = d.cards.find((c) => c.status === "moved");
    expect(moved && moved.status === "moved" && moved.toColumn).toBe("Doing");
  });

  it("does not mutate the input board", () => {
    const b = board();
    moveCard(b, "c1", "done", 0);
    expect(b.columns[0]!.cards.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("moveCard — same-column reorder", () => {
  it("reorders within a column, compensating for the removed slot", () => {
    const next = moveCard(board(), "c1", "todo", 2); // move First to the end
    expect(next.columns[0]!.cards.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("a no-op reorder produces an equal board (caller skips the write)", () => {
    const b = board();
    const next = moveCard(b, "c1", "todo", 0);
    expect(boardsEqual(b, next)).toBe(true);
  });
});

describe("moveCard — guards", () => {
  it("throws on an unknown card or column (never corrupts the board)", () => {
    expect(() => moveCard(board(), "ghost", "todo", 0)).toThrow();
    expect(() => moveCard(board(), "c1", "ghost", 0)).toThrow();
  });

  it("clamps an out-of-range target index", () => {
    const next = moveCard(board(), "c3", "done", 99);
    expect(next.columns[2]!.cards.map((c) => c.id)).toEqual(["c3"]);
  });
});
