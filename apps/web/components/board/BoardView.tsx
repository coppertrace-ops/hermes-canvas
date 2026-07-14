"use client";

/**
 * Kanban board renderer (PANES; Wave 2 P6, plan §6).
 *
 * Columns and cards from a parsed `Board`. A drag = one semantic move =
 * `onEdit(nextContent, why)` = one appended version (`canvas.editBoard`,
 * `replace_all`); the snapshot math lives in the pure `boardOps` helpers so this
 * component only wires HTML5 drag-and-drop to them. Read-only mode (no `onEdit`)
 * renders the same board without drag affordances — used for a flag-on board the
 * owner is only viewing, and safe as the default.
 *
 * Honest states: a card mid-drag dims; a rejected/failed write is the caller's to
 * surface (the mutation returns a structured outcome). Keyboard users get an
 * explicit move menu is out of scope for the MVP board — drag is pointer-first,
 * but every card and column is a labelled region so the board is still readable
 * with a screen reader.
 */

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { boardSchema } from "@hermes/contract";
import type { Board, BoardCard } from "@hermes/contract";
import { Badge, cssVar, Text } from "@hermes/ui";
import { boardsEqual, moveCard, serializeBoard } from "./boardOps";

export interface BoardViewProps {
  /** Parsed board snapshot (the focused version's content). */
  board: Board;
  /**
   * Commit a drag as one appended version. Omit for a read-only board (no drag).
   * `nextContent` is the serialized new board; `why` is the one-line audit note.
   */
  onEdit?: (nextContent: string, why: string) => void;
  className?: string;
}

const columnsWrap: CSSProperties = {
  display: "flex",
  gap: cssVar("space-3"),
  alignItems: "flex-start",
  overflowX: "auto",
  paddingBottom: cssVar("space-2"),
};

const columnStyle: CSSProperties = {
  flex: "0 0 16rem",
  display: "flex",
  flexDirection: "column",
  gap: cssVar("space-2"),
  background: cssVar("surface-sunken"),
  border: `1px solid ${cssVar("border")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-2"),
  minHeight: "4rem",
};

const cardStyle: CSSProperties = {
  background: cssVar("surface"),
  border: `1px solid ${cssVar("border-strong")}`,
  borderRadius: cssVar("radius-sm"),
  padding: cssVar("space-2"),
  boxShadow: cssVar("shadow-sm"),
};

interface DragState {
  cardId: string;
}

export function BoardView({ board, onEdit, className }: BoardViewProps) {
  const readOnly = !onEdit;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const safeBoard = useMemo<Board>(() => boardSchema.parse(board), [board]);

  const commitMove = useCallback(
    (cardId: string, toColumnId: string, toIndex: number) => {
      if (readOnly) return;
      let next: Board;
      try {
        next = moveCard(safeBoard, cardId, toColumnId, toIndex);
      } catch {
        return; // a bad drop (stale DOM) — never corrupt the board
      }
      if (boardsEqual(safeBoard, next)) return; // no-op drop: no version churn
      const card = safeBoard.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
      const toCol = safeBoard.columns.find((c) => c.id === toColumnId);
      const why = card && toCol ? `moved "${card.title}" to ${toCol.title}` : "reordered board";
      onEdit!(serializeBoard(next), why);
    },
    [readOnly, safeBoard, onEdit],
  );

  function onCardDragStart(e: DragEvent, card: BoardCard) {
    if (readOnly) return;
    setDrag({ cardId: card.id });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.id);
  }

  function onColumnDrop(e: DragEvent, columnId: string, index: number) {
    e.preventDefault();
    const cardId = drag?.cardId ?? e.dataTransfer.getData("text/plain");
    setDrag(null);
    setOverCol(null);
    if (cardId) commitMove(cardId, columnId, index);
  }

  return (
    <div className={className ? `hc-board ${className}` : "hc-board"} style={columnsWrap} aria-label="Kanban board">
      {safeBoard.columns.map((col) => (
        <section
          key={col.id}
          style={{
            ...columnStyle,
            outline: overCol === col.id ? `2px solid ${cssVar("accent")}` : "none",
          }}
          aria-label={`Column: ${col.title}`}
          onDragOver={(e) => {
            if (readOnly) return;
            e.preventDefault();
            setOverCol(col.id);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
          onDrop={(e) => onColumnDrop(e, col.id, col.cards.length)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text size="sm" weight="semibold">
              {col.title}
            </Text>
            <Badge size="sm" variant="subtle" tone="neutral">
              {String(col.cards.length)}
            </Badge>
          </div>
          {col.cards.length === 0 && (
            <Text size="xs" tone="tertiary">
              No cards
            </Text>
          )}
          {col.cards.map((card, index) => (
            <article
              key={card.id}
              style={{
                ...cardStyle,
                opacity: drag?.cardId === card.id ? 0.5 : 1,
                cursor: readOnly ? "default" : "grab",
              }}
              draggable={!readOnly}
              aria-label={`Card: ${card.title}`}
              onDragStart={(e) => onCardDragStart(e, card)}
              onDragEnd={() => {
                setDrag(null);
                setOverCol(null);
              }}
              onDrop={(e) => {
                e.stopPropagation();
                onColumnDrop(e, col.id, index);
              }}
              onDragOver={(e) => !readOnly && e.preventDefault()}
            >
              <Text size="sm" weight="medium">
                {card.title}
              </Text>
              {card.body && (
                <Text size="xs" tone="secondary" style={{ marginTop: cssVar("space-1") }}>
                  {card.body}
                </Text>
              )}
              {card.labels.length > 0 && (
                <div style={{ display: "flex", gap: cssVar("space-1"), marginTop: cssVar("space-1"), flexWrap: "wrap" }}>
                  {card.labels.map((label) => (
                    <Badge key={label} size="sm" variant="subtle" tone="accent">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
