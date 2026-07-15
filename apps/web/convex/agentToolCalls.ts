import type { ApiError } from "@hermes/contract";
import { firstToolCallCapExceeded, LIMITS, TOOL_CALL_UPSERTS_PER_MIN } from "@hermes/contract";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

/**
 * Tool-call receipt ingest (OWNER: LEDGER, Chat surface).
 *
 * The `internalMutation` behind `PUT /agent/tool-calls/:tool_call_id`, invoked by
 * the HTTP action after service-token auth + zod validation — the same pattern as
 * `agentInfra.ts` (status/memory). Receipts are infra reporting, NOT the
 * append-only ledger: NO `events` row is written (a receipt is not a
 * user-meaningful Canvas action, and per-receipt events would spam the audit
 * feed), and a row IS patched in place (start `running` -> terminal status is the
 * whole feature).
 *
 * Two enforcement points, both authoritative here (no HTTP-layer bypass):
 *  - Byte caps on args_summary/result_tail/error_message -> structured `oversize`
 *    naming the cap. The host pre-truncates, but a misbehaving host is rejected,
 *    never silently truncated (the "evidence not silence" rule).
 *  - A dedicated upsert rate limit (`TOOL_CALL_UPSERTS_PER_MIN`) counted over the
 *    `tool_calls` table only, so a receipt storm cannot starve artifact writes
 *    (which count `versions`) and vice-versa.
 *
 * Rejections are RETURNED (not thrown) so the HTTP layer maps them to the right
 * status without a 500 — mirroring `lib/outcome.ts`.
 */

export type ToolCallOutcome =
  | { ok: true; tool_call_id: string; status: "running" | "ok" | "error" | "blocked" }
  | { ok: false; error: ApiError };

/** Recent tool-call upsert count in the rate window, oldest-in-window for retry-after. */
async function recentToolCallWrites(ctx: MutationCtx, now: number): Promise<{ count: number; oldest: number | null }> {
  const cutoff = now - LIMITS.RATE_WINDOW_MS;
  const rows = await ctx.db
    .query("tool_calls")
    .withIndex("by_updated_at", (q) => q.gt("updated_at", cutoff))
    .collect();
  let oldest: number | null = null;
  for (const r of rows) if (oldest === null || r.updated_at < oldest) oldest = r.updated_at;
  return { count: rows.length, oldest };
}

export const upsertToolCall = internalMutation({
  args: {
    tool_call_id: v.string(),
    tool: v.string(),
    status: v.union(v.literal("running"), v.literal("ok"), v.literal("error"), v.literal("blocked")),
    args_summary: v.optional(v.string()),
    result_tail: v.optional(v.string()),
    error_message: v.optional(v.string()),
    session_id: v.optional(v.string()),
    turn_id: v.optional(v.string()),
    started_at: v.optional(v.number()),
    finished_at: v.optional(v.number()),
    duration_ms: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ToolCallOutcome> => {
    const now = Date.now();

    // 1) Byte caps — structured oversize naming the cap (no silent truncation).
    const over = firstToolCallCapExceeded(args);
    if (over) {
      const error: ApiError = {
        code: "oversize",
        message: `${over.field} exceeds ${over.limit} (${over.actual} bytes > limit ${over.limit_value} bytes)`,
        detail: { limit: over.limit, limit_value: over.limit_value, actual: over.actual, unit: "bytes" },
      };
      return { ok: false, error };
    }

    // 2) Dedicated upsert budget (independent of the artifact write ceiling).
    const recent = await recentToolCallWrites(ctx, now);
    if (recent.count >= TOOL_CALL_UPSERTS_PER_MIN) {
      const retry_after_ms = recent.oldest === null
        ? LIMITS.RATE_WINDOW_MS
        : Math.max(1, recent.oldest + LIMITS.RATE_WINDOW_MS - now);
      const error: ApiError = {
        code: "rate_limited",
        message: `tool-call receipt rate limit exceeded (limit ${TOOL_CALL_UPSERTS_PER_MIN}/min); retry after ${retry_after_ms} ms`,
        detail: { scope: "tool_calls", limit: TOOL_CALL_UPSERTS_PER_MIN, retry_after_ms },
      };
      return { ok: false, error };
    }

    // 3) Upsert by tool_call_id: start -> insert; completion -> patch in place; a
    // completed-only post inserts the finished row directly.
    const existing = await ctx.db
      .query("tool_calls")
      .withIndex("by_tool_call_id", (q) => q.eq("tool_call_id", args.tool_call_id))
      .unique();

    // Merge timestamps across start + completion to derive a duration when the
    // reporter omitted it but both bounds are known.
    const startedAt = args.started_at ?? existing?.started_at;
    const finishedAt = args.finished_at ?? existing?.finished_at;
    const derivedDuration =
      args.duration_ms ??
      existing?.duration_ms ??
      (startedAt !== undefined && finishedAt !== undefined && finishedAt >= startedAt
        ? finishedAt - startedAt
        : undefined);

    if (existing) {
      // Patch only the fields this receipt carries, so a terminal completion never
      // wipes the args_summary the start receipt recorded. Status always advances.
      const patch: Partial<Doc<"tool_calls">> = { status: args.status, tool: args.tool, updated_at: now };
      if (args.args_summary !== undefined) patch.args_summary = args.args_summary;
      if (args.result_tail !== undefined) patch.result_tail = args.result_tail;
      if (args.error_message !== undefined) patch.error_message = args.error_message;
      if (args.session_id !== undefined) patch.session_id = args.session_id;
      if (args.turn_id !== undefined) patch.turn_id = args.turn_id;
      if (startedAt !== undefined) patch.started_at = startedAt;
      if (finishedAt !== undefined) patch.finished_at = finishedAt;
      if (derivedDuration !== undefined) patch.duration_ms = derivedDuration;
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("tool_calls", {
        tool_call_id: args.tool_call_id,
        tool: args.tool,
        status: args.status,
        args_summary: args.args_summary,
        result_tail: args.result_tail,
        error_message: args.error_message,
        session_id: args.session_id,
        turn_id: args.turn_id,
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: derivedDuration,
        updated_at: now,
      });
    }

    return { ok: true, tool_call_id: args.tool_call_id, status: args.status };
  },
});
