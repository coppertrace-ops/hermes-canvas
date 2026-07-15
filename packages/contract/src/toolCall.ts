import { z } from "zod";
import { byteLength } from "./limits";

/**
 * Tool-call receipt wire shape (OWNER: LEDGER, Chat surface).
 *
 * The external Hermes gateway posts a receipt when a model/subagent tool call
 * starts and again when it finishes; the chat timeline renders these as
 * live-updating rows (edit-in-place, Telegram-style). Like `status.ts`/`job.ts`
 * this is PLUGIN INFRASTRUCTURE, not a model-facing Canvas tool: the model never
 * calls it, so it lives in the doc's Infrastructure section, never the tool
 * manifest.
 *
 * As with the other infra shapes, this zod schema is the single source of truth —
 * it validates the wire and types the mutation. The receipts arrive already
 * redacted + truncated by the host, but the caps below are ALSO enforced in the
 * mutation (the no-bypass rule): a receipt that exceeds a cap is rejected with a
 * structured `oversize` error naming the cap, never silently truncated.
 */

// ---------------------------------------------------------------------------
// Caps (infra-local; intentionally NOT in the frozen LIMITS surface, which is
// the Canvas artifact/message/job vocabulary the tool manifest renders).
// Measured on UTF-8 bytes and enforced authoritatively in the mutation.
// ---------------------------------------------------------------------------

/** Max size of a redacted argument summary on a receipt. */
export const TOOL_ARGS_SUMMARY_MAX_BYTES = 500;
/** Max size of a captured result tail on a completion receipt. */
export const TOOL_RESULT_TAIL_MAX_BYTES = 2 * 1024;
/** Max size of an error message on a failed/blocked receipt. */
export const TOOL_ERROR_MESSAGE_MAX_BYTES = 2 * 1024;

/**
 * Dedicated upsert budget for tool-call receipts (per RATE_WINDOW_MS). Receipts
 * are chatty — a busy turn fires many parallel/subagent tools — so they get their
 * OWN generous bucket rather than drawing down the artifact/message write ceiling
 * (`AGENT_WRITES_PER_MIN_GLOBAL`). Tool-call upserts write only the `tool_calls`
 * table (never `versions`), so the two limiters are independent by construction:
 * a receipt storm can never starve an artifact write, and vice-versa.
 */
export const TOOL_CALL_UPSERTS_PER_MIN = 120;

export const toolCallStatusSchema = z.enum(["running", "ok", "error", "blocked"]);
export type ToolCallStatus = z.infer<typeof toolCallStatusSchema>;

/**
 * The stable id that joins a start receipt to its completion (path parameter, not
 * body). Url-safe so it slots into `/agent/tool-calls/:tool_call_id` without
 * escaping surprises — the same discipline as a job key.
 */
export const toolCallIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9._:-]+$/, "tool_call_id must be url-safe (alnum . _ : -)");

// ---------------------------------------------------------------------------
// PUT /agent/tool-calls/:tool_call_id — upsert one receipt.
// A start posts {status:"running"}; the completion posts a terminal status and
// updates the same row in place. A single completed post (no prior running row)
// creates the finished row directly. `updated_at` is server-stamped.
//
// The string `.max()`s below are loose CHAR bounds (defence against pathological
// input); the authoritative BYTE caps are enforced in the mutation so the
// rejection is a structured `oversize` naming the cap, matching the message path.
// ---------------------------------------------------------------------------

export const toolCallUpsertSchema = z
  .object({
    /** Display name of the tool, e.g. "canvas_update_artifact" or "bash". */
    tool: z.string().trim().min(1).max(256),
    status: toolCallStatusSchema,
    /** Redacted, single-line argument summary (host-truncated; capped server-side). */
    args_summary: z.string().max(4000).optional(),
    /** Captured tail of the tool result (host-truncated; capped server-side). */
    result_tail: z.string().max(20_000).optional(),
    /** Failure detail on an error/blocked receipt (host-truncated; capped server-side). */
    error_message: z.string().max(20_000).optional(),
    /** Originating session; a subagent tool carries its own distinct session id. */
    session_id: z.string().max(256).optional(),
    /** The turn this call belongs to (groups a burst of receipts in the timeline). */
    turn_id: z.string().max(256).optional(),
    /** Epoch ms the call started (supplied by the reporter; the Canvas is not the clock). */
    started_at: z.number().int().nonnegative().optional(),
    /** Epoch ms the call finished. */
    finished_at: z.number().int().nonnegative().optional(),
    /** Wall-clock duration in ms; derived from the timestamps when omitted. */
    duration_ms: z.number().int().nonnegative().optional(),
  })
  .refine((r) => r.finished_at === undefined || r.started_at === undefined || r.finished_at >= r.started_at, {
    message: "finished_at must be >= started_at",
    path: ["finished_at"],
  });
export type ToolCallUpsert = z.infer<typeof toolCallUpsertSchema>;

/**
 * The three byte caps, paired with the field they guard and the constant name
 * surfaced in an `oversize` rejection. The mutation iterates this so the cap can
 * never be described in one place and enforced differently in another.
 */
export const TOOL_CALL_BYTE_CAPS = [
  { field: "args_summary", limit: "TOOL_ARGS_SUMMARY_MAX_BYTES", max: TOOL_ARGS_SUMMARY_MAX_BYTES },
  { field: "result_tail", limit: "TOOL_RESULT_TAIL_MAX_BYTES", max: TOOL_RESULT_TAIL_MAX_BYTES },
  { field: "error_message", limit: "TOOL_ERROR_MESSAGE_MAX_BYTES", max: TOOL_ERROR_MESSAGE_MAX_BYTES },
] as const;

/**
 * First field on `input` that exceeds its UTF-8 byte cap, or null when all fit.
 * Pure so both the mutation and its tests agree on the boundary. Returns the
 * named cap + actual size for the structured `oversize` rejection.
 */
export function firstToolCallCapExceeded(input: {
  args_summary?: string;
  result_tail?: string;
  error_message?: string;
}): { field: string; limit: string; limit_value: number; actual: number } | null {
  for (const cap of TOOL_CALL_BYTE_CAPS) {
    const value = input[cap.field as keyof typeof input];
    if (value === undefined) continue;
    const actual = byteLength(value);
    if (actual > cap.max) {
      return { field: cap.field, limit: cap.limit, limit_value: cap.max, actual };
    }
  }
  return null;
}
