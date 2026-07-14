import { isValidMetricsEvent, summarizeReadership } from "@hermes/diff";
import type { MetricsEvent, ReadershipSummary } from "@hermes/diff";
import { v } from "convex/values";
import { requireOwner } from "./authGuard";
import { mutation, query } from "./_generated/server";

/**
 * Readership-test instrumentation sink (OWNER: CHRONICLE, plan §3, §8 G4, §10).
 *
 * "Instrumentation is a Phase 4 deliverable with the same priority as the diff
 * renderer itself." The 4-week readership test decides whether the versioning UX
 * earns continued investment; its kill/keep signal is unread badges + unopened
 * diffs + write-only artifacts. So we record exactly the reader actions that
 * signal engagement: diff opens, badge clicks, restores, first-views (with the
 * time-to-first-view latency), and merge-prompt interactions.
 *
 * The `metrics` table is append-only (like `versions`/`events`): a recorded
 * observation is never patched. The event vocabulary, validation, and the
 * summary aggregation all live in `@hermes/diff` (pure, tested); these are the
 * thin Convex I/O wrappers. Nothing here reads or writes artifact content.
 *
 * AUTH: every function here is browser-only (not wired into `/agent/*`) and
 * `requireOwner`s at its top. `recordEvent` stops an anonymous caller injecting
 * readership events that would skew the kill/keep signal; `readershipSummary` and
 * `listEvents` are guarded so the instrumentation is not world-readable over the
 * public Convex API.
 */

const kindValidator = v.union(
  v.literal("diff_opened"),
  v.literal("badge_clicked"),
  v.literal("restore_performed"),
  v.literal("artifact_first_viewed"),
  v.literal("merge_prompt_opened"),
  v.literal("merge_resolved"),
);

/**
 * Record one readership event. `at` is stamped server-side so the client cannot
 * skew the timeline; the caller may still supply `time_to_first_view_ms` (a
 * duration it measured locally). Invalid shapes are rejected rather than stored.
 */
export const recordEvent = mutation({
  args: {
    kind: kindValidator,
    artifact_id: v.optional(v.string()),
    tab_id: v.optional(v.string()),
    seq: v.optional(v.number()),
    from_seq: v.optional(v.number()),
    time_to_first_view_ms: v.optional(v.number()),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ recorded: boolean }> => {
    await requireOwner(ctx);
    const now = Date.now();
    const event: MetricsEvent = {
      kind: args.kind,
      artifactId: args.artifact_id,
      tabId: args.tab_id,
      seq: args.seq,
      fromSeq: args.from_seq,
      timeToFirstViewMs: args.time_to_first_view_ms,
      resolution: args.resolution,
      at: now,
    };
    // Defense in depth: the pure guard is the single source of validity.
    if (!isValidMetricsEvent(event)) return { recorded: false };
    await ctx.db.insert("metrics", {
      kind: args.kind,
      artifact_id: args.artifact_id,
      tab_id: args.tab_id,
      seq: args.seq,
      from_seq: args.from_seq,
      time_to_first_view_ms:
        args.time_to_first_view_ms !== undefined && args.time_to_first_view_ms >= 0
          ? args.time_to_first_view_ms
          : undefined,
      resolution: args.resolution,
      at: now,
    });
    return { recorded: true };
  },
});

/** Convert a stored `metrics` row back into the pure `MetricsEvent` shape. */
function toEvent(row: {
  kind: MetricsEvent["kind"];
  artifact_id?: string;
  tab_id?: string;
  seq?: number;
  from_seq?: number;
  time_to_first_view_ms?: number;
  resolution?: string;
  at: number;
}): MetricsEvent {
  return {
    kind: row.kind,
    artifactId: row.artifact_id,
    tabId: row.tab_id,
    seq: row.seq,
    fromSeq: row.from_seq,
    timeToFirstViewMs: row.time_to_first_view_ms,
    resolution: row.resolution,
    at: row.at,
  };
}

/**
 * The readership-test report — the kill/keep signal (plan §7, §10 risk 4).
 * Aggregation runs through `@hermes/diff`'s `summarizeReadership`, so the report
 * definition is identical to what the unit tests assert.
 */
export const readershipSummary = query({
  args: { since: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ReadershipSummary> => {
    await requireOwner(ctx);
    const rows =
      args.since !== undefined
        ? await ctx.db
            .query("metrics")
            .withIndex("by_at", (q) => q.gte("at", args.since!))
            .collect()
        : await ctx.db.query("metrics").collect();
    return summarizeReadership(rows.map(toEvent));
  },
});

/** Raw event log (bounded), for a detailed instrumentation view if wanted. */
export const listEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<MetricsEvent[]> => {
    await requireOwner(ctx);
    const rows = await ctx.db
      .query("metrics")
      .withIndex("by_at")
      .order("desc")
      .take(args.limit ?? 200);
    return rows.map(toEvent);
  },
});
