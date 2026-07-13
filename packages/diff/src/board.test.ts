import { describe, expect, it } from "vitest";
import { diffBoard } from "./board";

/** Minimal board builder for fixtures. */
function board(
  cols: Array<{
    id: string;
    title: string;
    cards: Array<{ id: string; title: string; body?: string }>;
  }>,
): string {
  return JSON.stringify({
    columns: cols.map((c) => ({
      id: c.id,
      title: c.title,
      cards: c.cards.map((k) => ({ id: k.id, title: k.title, body: k.body ?? "", labels: [] })),
    })),
  });
}

describe("diffBoard — semantic card diff", () => {
  it("detects an added card", () => {
    const a = board([{ id: "todo", title: "To Do", cards: [{ id: "c1", title: "First" }] }]);
    const b = board([
      {
        id: "todo",
        title: "To Do",
        cards: [
          { id: "c1", title: "First" },
          { id: "c2", title: "Second" },
        ],
      },
    ]);
    const d = diffBoard(a, b);
    expect(d.addedCards).toBe(1);
    expect(d.cards.find((c) => c.status === "added")).toMatchObject({ status: "added" });
    expect(d.identical).toBe(false);
  });

  it("detects a removed card", () => {
    const a = board([
      {
        id: "todo",
        title: "To Do",
        cards: [
          { id: "c1", title: "First" },
          { id: "c2", title: "Second" },
        ],
      },
    ]);
    const b = board([{ id: "todo", title: "To Do", cards: [{ id: "c1", title: "First" }] }]);
    const d = diffBoard(a, b);
    expect(d.removedCards).toBe(1);
  });

  it("detects a MOVE (card kept identity across columns) — not remove+add", () => {
    const a = board([
      { id: "todo", title: "To Do", cards: [{ id: "c1", title: "Task" }] },
      { id: "done", title: "Done", cards: [] },
    ]);
    const b = board([
      { id: "todo", title: "To Do", cards: [] },
      { id: "done", title: "Done", cards: [{ id: "c1", title: "Task" }] },
    ]);
    const d = diffBoard(a, b);
    expect(d.movedCards).toBe(1);
    expect(d.addedCards).toBe(0);
    expect(d.removedCards).toBe(0);
    const moved = d.cards.find((c) => c.status === "moved");
    expect(moved).toMatchObject({ status: "moved", fromColumn: "To Do", toColumn: "Done" });
  });

  it("detects an edited card with word-level title diff", () => {
    const a = board([
      { id: "todo", title: "To Do", cards: [{ id: "c1", title: "Write draft", body: "old body" }] },
    ]);
    const b = board([
      {
        id: "todo",
        title: "To Do",
        cards: [{ id: "c1", title: "Write final draft", body: "new body" }],
      },
    ]);
    const d = diffBoard(a, b);
    expect(d.editedCards).toBe(1);
    const edited = d.cards.find((c) => c.status === "edited") as {
      status: "edited";
      titleWords?: { type: string; value: string }[];
    };
    expect(edited.titleWords?.some((w) => w.type === "ins" && w.value.trim() === "final")).toBe(
      true,
    );
  });

  it("detects a renamed column", () => {
    const a = board([{ id: "col", title: "Backlog", cards: [] }]);
    const b = board([{ id: "col", title: "Icebox", cards: [] }]);
    const d = diffBoard(a, b);
    expect(d.columns.find((c) => c.status === "renamed")).toMatchObject({
      before: "Backlog",
      after: "Icebox",
    });
  });

  it("flags identical boards", () => {
    const a = board([{ id: "todo", title: "To Do", cards: [{ id: "c1", title: "Task" }] }]);
    expect(diffBoard(a, a).identical).toBe(true);
  });
});
