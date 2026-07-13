import { aggregateTabChanged, isArtifactChanged, nextLastSeen } from "@hermes/diff";
import type { HasHead } from "@hermes/diff";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

/**
 * Changed-since-you-last-looked persistence (OWNER: CHRONICLE, plan §3).
 *
 * `last_seen` holds one row per artifact (single owner): the head seq the owner
 * has acknowledged. An artifact is "changed" when `head_seq > last_seen.seq`;
 * marking it seen advances `last_seen` to the head. The *logic* — the monotonic
 * advance and the per-tab aggregation — lives in `@hermes/diff` (pure, unit
 * tested); these functions are the thin Convex I/O around it, so the rule cannot
 * drift between the badges, the mutations, and the tests.
 *
 * These are owner-only surfaces reached the same way as the sibling human history
 * action `canvas.restoreArtifact` (plan §6 enforces the owner identity across the
 * non-`/agent/*` surface); they never touch the append-only `versions`/`events`
 * tables, only the owner's private `last_seen` cursor.
 */

/**
 * Mark an artifact seen up to `seq` (defaults to its current head). Advances the
 * `last_seen` cursor monotonically — seeing an older version never "un-sees"
 * newer ones (plan §3). Returns the seq now stored, or the unchanged value when
 * no advance was needed. Idempotent and safe to call on every focus/dwell tick.
 */
export const markSeen = mutation({
  args: { artifact_id: v.string(), seq: v.optional(v.number()) },
  handler: async (ctx: MutationCtx, args): Promise<{ artifact_id: string; seq: number }> => {
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_art_key", (q) => q.eq("art_key", args.artifact_id))
      .unique();
    // Seeing at most the head; an explicit seq is clamped to the head so a stale
    // client cannot push the cursor past real history.
    const head = artifact?.head_seq ?? args.seq ?? 0;
    const target = args.seq !== undefined ? Math.min(args.seq, head) : head;

    const existing = await ctx.db
      .query("last_seen")
      .withIndex("by_artifact", (q) => q.eq("artifact_id", args.artifact_id))
      .unique();
    const advance = nextLastSeen(existing?.seq, target);
    if (advance === null) {
      return { artifact_id: args.artifact_id, seq: existing?.seq ?? 0 };
    }
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { seq: advance, at: now });
    } else {
      await ctx.db.insert("last_seen", { artifact_id: args.artifact_id, seq: advance, at: now });
    }
    return { artifact_id: args.artifact_id, seq: advance };
  },
});

/** The full last-seen map (artifact_id → seq). Live-queried by the badge adapter. */
export const getLastSeen = query({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    const rows = await ctx.db.query("last_seen").collect();
    const map: Record<string, number> = {};
    for (const r of rows) map[r.artifact_id] = r.seq;
    return map;
  },
});

export interface ArtifactChange {
  artifact_id: string;
  tab_id?: string;
  head_seq: number;
  last_seen_seq: number;
  changed: boolean;
}

/**
 * Server-computed changed feed: joins active artifacts against `last_seen` and
 * returns per-artifact `changed` flags plus the per-tab aggregate. Integration
 * subscribes to this one live query to drive every badge and tab dot, so the
 * client carries no changed-since arithmetic (it all runs through `@hermes/diff`).
 */
export const listArtifactChanges = query({
  args: { include_archived: v.optional(v.boolean()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    artifacts: ArtifactChange[];
    tabChangedCounts: Record<string, number>;
    totalChanged: number;
  }> => {
    const docs = await ctx.db.query("artifacts").collect();
    const active = docs.filter((d) => args.include_archived || d.status === "active");
    const seenRows = await ctx.db.query("last_seen").collect();
    const seen: Record<string, number> = {};
    for (const r of seenRows) seen[r.artifact_id] = r.seq;

    const artifacts: ArtifactChange[] = active.map((d) => ({
      artifact_id: d.art_key,
      tab_id: d.tab_id,
      head_seq: d.head_seq,
      last_seen_seq: seen[d.art_key] ?? 0,
      changed: isArtifactChanged(d.head_seq, seen[d.art_key]),
    }));

    const asHeads: HasHead[] = active.map((d) => ({
      id: d.art_key,
      tabId: d.tab_id,
      headSeq: d.head_seq,
    }));
    const tabChangedCounts = aggregateTabChanged(asHeads, seen);
    const totalChanged = artifacts.reduce((n, a) => n + (a.changed ? 1 : 0), 0);
    return { artifacts, tabChangedCounts, totalChanged };
  },
});
