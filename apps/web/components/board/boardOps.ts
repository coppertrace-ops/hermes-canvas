/**
 * Pure board mutation helpers (PANES; Wave 2 P6, plan §6).
 *
 * A drag on the Kanban board is one semantic operation → one new `Board` snapshot
 * → one appended version (`canvas.editBoard`, `replace_all`). Keeping the snapshot
 * math here (no React, no Convex) means it is exhaustively unit-testable and the
 * `BoardView` component stays a thin view. Card identity is stable (frozen board
 * schema), so a cross-column drag is a move, not remove+add — matching how
 * `@hermes/diff`'s `diffBoard` reads it back.
 */

import { boardSchema } from "@hermes/contract";
import type { Board } from "@hermes/contract";

/** Deep-ish clone via the frozen schema (also re-validates structure). */
function clone(board: Board): Board {
  return boardSchema.parse(JSON.parse(JSON.stringify(board)));
}

/** Locate a card by id, returning its column index and card index (or null). */
export function findCard(board: Board, cardId: string): { col: number; idx: number } | null {
  for (let c = 0; c < board.columns.length; c++) {
    const idx = board.columns[c]!.cards.findIndex((card) => card.id === cardId);
    if (idx !== -1) return { col: c, idx };
  }
  return null;
}

/**
 * Move `cardId` to `toColumnId` at `toIndex` (clamped). A move within the same
 * column is a reorder. Returns a NEW board; the input is untouched. Throws if the
 * card or target column doesn't exist (caller should guard from the DOM, but the
 * throw keeps a bad drag from silently corrupting the board).
 */
export function moveCard(board: Board, cardId: string, toColumnId: string, toIndex: number): Board {
  const next = clone(board);
  const loc = findCard(next, cardId);
  if (!loc) throw new Error(`card ${cardId} not found`);
  const targetCol = next.columns.findIndex((col) => col.id === toColumnId);
  if (targetCol === -1) throw new Error(`column ${toColumnId} not found`);

  const [card] = next.columns[loc.col]!.cards.splice(loc.idx, 1);
  const dest = next.columns[targetCol]!.cards;
  // When moving within the same column and removing an earlier card, the target
  // index shifts left by one; clamp into the post-removal range either way.
  let insertAt = toIndex;
  if (loc.col === targetCol && loc.idx < toIndex) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, dest.length));
  dest.splice(insertAt, 0, card!);
  return next;
}

/** Serialize a board for storage (canonical JSON the mutation stores verbatim). */
export function serializeBoard(board: Board): string {
  return JSON.stringify(boardSchema.parse(board));
}

/** True when two boards are structurally identical (skip a no-op write). */
export function boardsEqual(a: Board, b: Board): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
