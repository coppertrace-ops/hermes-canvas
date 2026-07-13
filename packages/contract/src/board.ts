import { z } from "zod";

/**
 * Board (Kanban) JSON schema — frozen in the contract at G1 (plan §6, §8).
 *
 * A `board` artifact stores this document as its content (JSON-stringified). The
 * renderer and the semantic card-level diff both read this shape; freezing it
 * here means P6 boards are a thin validated type, not a product of their own.
 *
 * Ids are stable strings minted by whoever creates the card/column (agent or the
 * UI); the diff engine keys on them to detect add / remove / move / edit.
 */

export const boardCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(""),
  /** Optional labels for grouping/colour; free-form, capped by array length. */
  labels: z.array(z.string()).max(16).default([]),
});

export const boardColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Ordered cards; order within a column is meaningful (drag = reorder). */
  cards: z.array(boardCardSchema).max(500),
});

export const boardSchema = z.object({
  columns: z.array(boardColumnSchema).max(50),
});

export type BoardCard = z.infer<typeof boardCardSchema>;
export type BoardColumn = z.infer<typeof boardColumnSchema>;
export type Board = z.infer<typeof boardSchema>;

/**
 * Parse+validate board content from its stored string form. Throws a zod error
 * on malformed JSON or shape mismatch; callers convert that into a
 * `validation_failed` CanvasError.
 */
export function parseBoardContent(content: string): Board {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("board content is not valid JSON");
  }
  return boardSchema.parse(json);
}
