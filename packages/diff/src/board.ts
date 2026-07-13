/**
 * Board semantic diff (plan §3): "added / removed / moved / edited cards, column
 * changes". Cards carry stable ids (frozen in `@hermes/contract`'s board schema),
 * so the diff keys on identity rather than position — a card dragged to another
 * column reads as *moved*, not remove+add, which is the whole point of a semantic
 * board diff over a source diff.
 */

import { parseBoardContent } from "@hermes/contract";
import type { Board, BoardCard } from "@hermes/contract";
import { diffWords } from "./text";
import type { WordToken } from "./text";

export type CardChange =
  | { status: "added"; card: BoardCard; column: string }
  | { status: "removed"; card: BoardCard; column: string }
  | {
      status: "moved";
      card: BoardCard;
      fromColumn: string;
      toColumn: string;
      /** True when the card content also changed while moving. */
      edited: boolean;
    }
  | {
      status: "edited";
      before: BoardCard;
      after: BoardCard;
      column: string;
      titleWords?: WordToken[];
      bodyWords?: WordToken[];
    }
  | { status: "reordered"; card: BoardCard; column: string; fromIndex: number; toIndex: number }
  | { status: "unchanged"; card: BoardCard; column: string };

export type ColumnChange =
  | { status: "added"; id: string; title: string }
  | { status: "removed"; id: string; title: string }
  | { status: "renamed"; id: string; before: string; after: string }
  | { status: "unchanged"; id: string; title: string };

export interface BoardDiff {
  columns: ColumnChange[];
  cards: CardChange[];
  addedCards: number;
  removedCards: number;
  movedCards: number;
  editedCards: number;
  identical: boolean;
}

interface CardLoc {
  card: BoardCard;
  columnId: string;
  columnTitle: string;
  index: number;
}

function indexCards(board: Board): Map<string, CardLoc> {
  const map = new Map<string, CardLoc>();
  for (const col of board.columns) {
    col.cards.forEach((card, index) => {
      map.set(card.id, { card, columnId: col.id, columnTitle: col.title, index });
    });
  }
  return map;
}

function cardEdited(a: BoardCard, b: BoardCard): boolean {
  return a.title !== b.title || a.body !== b.body || a.labels.join("") !== b.labels.join("");
}

/**
 * Diff two board snapshots stored as JSON strings. Malformed input on either side
 * throws (the caller renders a source-diff fallback); valid boards produce a
 * card-identity-keyed semantic diff.
 */
export function diffBoard(before: string, after: string): BoardDiff {
  const a = parseBoardContent(before);
  const b = parseBoardContent(after);
  const aCards = indexCards(a);
  const bCards = indexCards(b);

  // --- Columns ---
  const columns: ColumnChange[] = [];
  const aCols = new Map(a.columns.map((c) => [c.id, c] as const));
  const bCols = new Map(b.columns.map((c) => [c.id, c] as const));
  for (const col of a.columns) {
    const other = bCols.get(col.id);
    if (!other) columns.push({ status: "removed", id: col.id, title: col.title });
    else if (other.title !== col.title)
      columns.push({ status: "renamed", id: col.id, before: col.title, after: other.title });
    else columns.push({ status: "unchanged", id: col.id, title: col.title });
  }
  for (const col of b.columns) {
    if (!aCols.has(col.id)) columns.push({ status: "added", id: col.id, title: col.title });
  }

  // --- Cards (keyed by id) ---
  const cards: CardChange[] = [];
  let added = 0;
  let removed = 0;
  let moved = 0;
  let edited = 0;

  for (const [id, loc] of aCards) {
    const other = bCards.get(id);
    if (!other) {
      cards.push({ status: "removed", card: loc.card, column: loc.columnTitle });
      removed++;
      continue;
    }
    const wasEdited = cardEdited(loc.card, other.card);
    if (loc.columnId !== other.columnId) {
      cards.push({
        status: "moved",
        card: other.card,
        fromColumn: loc.columnTitle,
        toColumn: other.columnTitle,
        edited: wasEdited,
      });
      moved++;
      if (wasEdited) edited++;
    } else if (wasEdited) {
      cards.push({
        status: "edited",
        before: loc.card,
        after: other.card,
        column: other.columnTitle,
        titleWords:
          loc.card.title !== other.card.title
            ? diffWords(loc.card.title, other.card.title)
            : undefined,
        bodyWords:
          loc.card.body !== other.card.body ? diffWords(loc.card.body, other.card.body) : undefined,
      });
      edited++;
    } else if (loc.index !== other.index) {
      cards.push({
        status: "reordered",
        card: other.card,
        column: other.columnTitle,
        fromIndex: loc.index,
        toIndex: other.index,
      });
    } else {
      cards.push({ status: "unchanged", card: other.card, column: other.columnTitle });
    }
  }
  for (const [id, loc] of bCards) {
    if (!aCards.has(id)) {
      cards.push({ status: "added", card: loc.card, column: loc.columnTitle });
      added++;
    }
  }

  const structuralColumnChange = columns.some((c) => c.status !== "unchanged");
  const cardChange = cards.some((c) => c.status !== "unchanged");
  return {
    columns,
    cards,
    addedCards: added,
    removedCards: removed,
    movedCards: moved,
    editedCards: edited,
    identical: !structuralColumnChange && !cardChange,
  };
}
