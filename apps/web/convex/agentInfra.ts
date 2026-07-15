import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

/**
 * Agent INFRASTRUCTURE write surface (OWNER: LEDGER, Settings surface).
 *
 * `internalMutation`s invoked by the `PUT /agent/status` and `PUT /agent/memory`
 * HTTP actions after service-token auth + zod validation (mirrors `agentWrites.ts`
 * for the Canvas ledger). These carry the gateway's self-reported state and a
 * mirror of the host memory store — plugin infrastructure, not model-facing tools.
 *
 * NO ledger events are written here. Status/memory are HIGH-FREQUENCY infra
 * reporting, not user-meaningful actions, so emitting `events` rows on every
 * heartbeat would spam the audit ledger with noise the activity feed never shows.
 * The closed `events` kind union has no status/memory kind, and skipping them
 * needs no widening — so this is consistent with the append-only audit design,
 * not an exception to it.
 */

const contextValidator = v.optional(
  v.object({ used_tokens: v.optional(v.number()), max_tokens: v.optional(v.number()) }),
);
const gatewayValidator = v.optional(
  v.object({ version: v.optional(v.string()), uptime_s: v.optional(v.number()) }),
);
const memoryValidator = v.optional(
  v.object({ provider: v.optional(v.string()), recall_budget: v.optional(v.number()) }),
);

/**
 * PUT /agent/status — upsert the singleton status row and server-stamp
 * `reported_at`. The body has already been zod-validated + size-capped in the HTTP
 * layer; this only performs the upsert I/O.
 */
export const upsertAgentStatus = internalMutation({
  args: {
    model: v.string(),
    provider: v.string(),
    effort: v.optional(v.string()),
    fallbacks: v.optional(v.array(v.string())),
    context: contextValidator,
    gateway: gatewayValidator,
    toolsets: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    sessions_active: v.optional(v.number()),
    memory: memoryValidator,
  },
  handler: async (ctx, args): Promise<{ ok: true; reported_at: number }> => {
    const reported_at = Date.now();
    const row = { ...args, reported_at };
    const existing = await ctx.db.query("agent_status").first();
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("agent_status", row);
    return { ok: true, reported_at };
  },
});

/**
 * PUT /agent/memory — bulk mirror sync. Upserts each entry by `entry_id` and
 * server-stamps `synced_at`. When `full` is true, local rows whose `entry_id` is
 * absent from the payload are DELETED so the table exactly mirrors host state —
 * see the schema comment: this table is a mirror, not the append-only ledger.
 */
export const syncMemories = internalMutation({
  args: {
    entries: v.array(
      v.object({
        entry_id: v.string(),
        content: v.string(),
        tags: v.optional(v.array(v.string())),
        source: v.optional(v.string()),
        created_at: v.optional(v.number()),
        updated_at: v.optional(v.number()),
      }),
    ),
    full: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ ok: true; upserted: number; deleted: number }> => {
    const synced_at = Date.now();
    const seen = new Set<string>();
    for (const entry of args.entries) {
      seen.add(entry.entry_id);
      const existing = await ctx.db
        .query("memories")
        .withIndex("by_entry_id", (q) => q.eq("entry_id", entry.entry_id))
        .unique();
      const fields = { ...entry, synced_at };
      if (existing) await ctx.db.patch(existing._id, fields);
      else await ctx.db.insert("memories", fields);
    }

    let deleted = 0;
    if (args.full) {
      const all: Doc<"memories">[] = await ctx.db.query("memories").collect();
      for (const row of all) {
        if (!seen.has(row.entry_id)) {
          await ctx.db.delete(row._id);
          deleted += 1;
        }
      }
    }
    return { ok: true, upserted: args.entries.length, deleted };
  },
});
