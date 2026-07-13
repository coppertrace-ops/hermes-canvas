import type {
  ArtifactRead,
  ArtifactSummary,
  Author,
  FeedEvent,
  FeedMessage,
  UpdatesResponse,
} from "@hermes/contract";
import { CanvasError, planRestoreArtifact } from "@hermes/contract";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { reject, type WriteOutcome } from "./lib/outcome";
import {
  applyPlan,
  getArtifactByKey,
  getVersion,
  recentArtifactWrites,
  recentGlobalAgentWrites,
} from "./lib/store";

/**
 * Read + feed queries and the human restore mutation (OWNER: LEDGER).
 *
 * The queries are the server-authoritative live views (plan §1): the browser
 * subscribes to them and the `/agent/*` GET actions call them via `ctx.runQuery`.
 * Restore is a human action from the history UI (CHRONICLE consumes it), routed
 * through the same append-only plan as every other write.
 */

function summaryOf(doc: Doc<"artifacts">): ArtifactSummary {
  return {
    artifact_id: doc.art_key,
    tab_id: doc.tab_id,
    type: doc.type,
    title: doc.title,
    status: doc.status,
    head_seq: doc.head_seq,
  };
}

/** Current global event seq (the updates cursor high-water mark). */
async function currentCursor(ctx: QueryCtx): Promise<number> {
  const row = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", "event_seq"))
    .unique();
  return row?.value ?? 0;
}

export const listArtifacts = query({
  args: { include_archived: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<ArtifactSummary[]> => {
    const docs = await ctx.db.query("artifacts").collect();
    return docs
      .filter((d) => args.include_archived || d.status === "active")
      .map(summaryOf);
  },
});

export const readArtifact = query({
  args: { artifact_id: v.string(), seq: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ArtifactRead | null> => {
    const doc = await getArtifactByKey(ctx, args.artifact_id);
    if (!doc) return null;
    const wantSeq = args.seq ?? doc.head_seq;
    const version = await getVersion(ctx, args.artifact_id, wantSeq);
    if (!version) return null;
    return {
      artifact: summaryOf(doc),
      version: {
        artifact_id: version.artifact_id,
        seq: version.seq,
        parent_seq: version.parent_seq,
        content: version.content,
        content_size: version.content_size,
        author: version.author,
        why: version.why,
        contended: version.contended,
        render_state: version.render_state,
        resolved_action: version.resolved_action,
        created_at: version.created_at,
      },
    };
  },
});

export const getUpdates = query({
  args: { cursor: v.optional(v.number()) },
  handler: async (ctx, args): Promise<UpdatesResponse> => {
    const cursor = args.cursor ?? 0;
    const eventDocs = await ctx.db
      .query("events")
      .withIndex("by_seq", (q) => q.gt("seq", cursor))
      .collect();
    const events: FeedEvent[] = eventDocs.map((e) => ({ seq: e.seq, kind: e.kind, actor: e.actor, refs: e.refs, at: e.at }));
    const msgDocs = await ctx.db
      .query("messages")
      .withIndex("by_event_seq", (q) => q.gt("event_seq", cursor))
      .collect();
    const messages: FeedMessage[] = msgDocs.map((m) => ({ message_id: m._id, role: m.role, body: m.body, status: m.status, at: m.at }));
    return { cursor: await currentCursor(ctx), messages, events };
  },
});

export const pendingWork = query({
  args: { cursor: v.optional(v.number()) },
  handler: async (ctx, args): Promise<UpdatesResponse> => {
    const cursor = args.cursor ?? 0;
    const eventDocs = await ctx.db
      .query("events")
      .withIndex("by_seq", (q) => q.gt("seq", cursor))
      .collect();
    const events: FeedEvent[] = eventDocs.map((e) => ({ seq: e.seq, kind: e.kind, actor: e.actor, refs: e.refs, at: e.at }));
    const msgDocs = await ctx.db
      .query("messages")
      .withIndex("by_event_seq", (q) => q.gt("event_seq", cursor))
      .collect();
    // Hermes reacts to human messages only.
    const messages: FeedMessage[] = msgDocs
      .filter((m) => m.role === "human")
      .map((m) => ({ message_id: m._id, role: m.role, body: m.body, status: m.status, at: m.at }));
    return { cursor: await currentCursor(ctx), messages, events };
  },
});

/** Human restore from the history UI — appends a new version equal to `seq`. */
export const restoreArtifact = mutation({
  args: { artifact_id: v.string(), seq: v.number(), why: v.string() },
  handler: async (ctx, args): Promise<WriteOutcome> => {
    const now = Date.now();
    const author: Author = "human";
    const doc = await getArtifactByKey(ctx, args.artifact_id);
    if (!doc) return reject(ctx, CanvasError.notFound(`artifact ${args.artifact_id}`), author, { artifact_id: args.artifact_id }, now);
    const source = await getVersion(ctx, args.artifact_id, args.seq);
    if (!source) return reject(ctx, CanvasError.notFound(`version ${args.seq} of artifact ${args.artifact_id}`), author, { artifact_id: args.artifact_id }, now);
    const recentArt = await recentArtifactWrites(ctx, args.artifact_id, now);
    const recentGlobal = await recentGlobalAgentWrites(ctx, now);
    let plan;
    try {
      plan = planRestoreArtifact({
        artifact: {
          id: doc.art_key,
          tab_id: doc.tab_id,
          type: doc.type,
          title: doc.title,
          status: doc.status,
          created_by: doc.created_by,
          head_seq: doc.head_seq,
          created_at: doc.created_at,
        },
        sourceContent: source.content,
        sourceSeq: args.seq,
        why: args.why,
        author,
        now,
        recentArtifactWrites: recentArt,
        recentGlobalWrites: recentGlobal,
      });
    } catch (e) {
      return reject(ctx, e, author, { artifact_id: args.artifact_id, version_seq: args.seq }, now);
    }
    await applyPlan(ctx, plan);
    return { ok: true, result: plan.result };
  },
});
