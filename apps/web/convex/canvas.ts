import { internal } from "./_generated/api";
import type {
  ArtifactRead,
  ArtifactSummary,
  ArtifactVersion,
  Author,
  FeedEvent,
  FeedMessage,
  UpdatesResponse,
} from "@hermes/contract";
import { CanvasError, planRestoreArtifact } from "@hermes/contract";
import { v } from "convex/values";
import { requireOwner } from "./authGuard";
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
 *
 * AUTH BOUNDARY (plan §6): `restoreArtifact` is the ONLY browser-callable mutation
 * in this file and it is NOT reachable through `/agent/*`, so it `requireOwner`s at
 * its top. The read queries here are DUAL-USE — the `/agent/*` GET routes reach
 * `listArtifacts` / `readArtifact` / `pendingWork` via the service-token path where
 * no user identity exists — so they deliberately do NOT adopt the owner guard;
 * applying it would break the agent read path. Mixed read authorization is out of
 * scope for this owner-write pass.
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

/** Project a stored version row into the wire `ArtifactVersion` shape. */
function versionOf(version: Doc<"versions">): ArtifactVersion {
  return {
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
      version: versionOf(version),
    };
  },
});

/** Active tabs in display order — the live source for the canvas tab bar. */
export const listTabs = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ id: string; title: string; order: number; status: "active" | "archived" }[]> => {
    const docs = await ctx.db.query("tabs").collect();
    return docs
      .filter((t) => t.status === "active")
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ id: t._id, title: t.title, order: t.order, status: t.status }));
  },
});

/**
 * Full append-only version chain for one artifact (CHRONICLE history surface).
 *
 * `readArtifact` returns a single version; the history panel needs the whole
 * ordered chain, each version carrying its `why` / `author` / `resolved_action`
 * metadata. Versions are immutable, so this is a pure read: ascending by seq, with
 * the mutable head pointer returned alongside. Returns `null` for an unknown
 * artifact so the panel can render an honest empty state.
 */
export const versionChain = query({
  args: { artifact_id: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ artifact: ArtifactSummary; head_seq: number; versions: ArtifactVersion[] } | null> => {
    const doc = await getArtifactByKey(ctx, args.artifact_id);
    if (!doc) return null;
    const rows = await ctx.db
      .query("versions")
      .withIndex("by_artifact_seq", (q) => q.eq("artifact_id", args.artifact_id))
      .collect();
    const versions = rows.sort((a, b) => a.seq - b.seq).map(versionOf);
    return { artifact: summaryOf(doc), head_seq: doc.head_seq, versions };
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

/**
 * Agent inbox: unacked human messages + events after cursor.
 *
 * Cursor alone is not enough — after a gateway restart the poller used to start
 * at 0 and re-mirror every historical human turn. Delivery is durable via
 * `messages.agent_delivered_at` (set by `ackHumanMessages`).
 */
export const pendingWork = query({
  args: { cursor: v.optional(v.number()) },
  handler: async (ctx, args): Promise<UpdatesResponse> => {
    const cursor = args.cursor ?? 0;
    const eventDocs = await ctx.db
      .query("events")
      .withIndex("by_seq", (q) => q.gt("seq", cursor))
      .collect();
    const events: FeedEvent[] = eventDocs.map((e) => ({ seq: e.seq, kind: e.kind, actor: e.actor, refs: e.refs, at: e.at }));
    // Unacked human turns only (ignore cursor for messages — ack is the gate).
    const humanDocs = await ctx.db.query("messages").withIndex("by_event_seq").order("asc").collect();
    const messages: FeedMessage[] = humanDocs
      .filter((m) => m.role === "human" && m.agent_delivered_at === undefined)
      .slice(0, 50)
      .map((m) => ({ message_id: m._id, role: m.role, body: m.body, status: m.status, at: m.at }));
    return { cursor: await currentCursor(ctx), messages, events };
  },
});

function feedMessageOf(m: Doc<"messages">): FeedMessage {
  return { message_id: m._id, role: m.role, body: m.body, status: m.status, at: m.at };
}

/**
 * Host-connector telemetry receipts were written into `messages` as agent rows.
 * They are not chat turns — keep them out of the transcript so the pane opens on
 * real conversation, not hundreds of tool-start lines.
 */
function isTranscriptMessage(m: Doc<"messages">): boolean {
  if (m.role === "human") return true;
  const body = m.body.trimStart();
  // Host-connector receipt lines (emoji + labels) are telemetry, not chat.
  if (/^(🔧|✅|❌|⏹|🧹|🛰️|🧠|📨|⚠️|🛠|👤|🟢|🔴|🟡)/u.test(body)) return false;
  if (/^tool (start|ok|error)\b/i.test(body)) return false;
  if (/^session (start|end|finalized|started)\b/i.test(body)) return false;
  if (/^turn start\b/i.test(body)) return false;
  if (/^Hermes Canvas connector/i.test(body)) return false;
  // Keep intentional agent chat: free text / markdown without receipt prefixes.
  return true;
}

export type ChatPage = {
  messages: FeedMessage[];
  /** True when another older page may exist. */
  has_more: boolean;
  /** Lowest event_seq in this page (use as `before_event_seq` for the next older page). */
  oldest_event_seq: number | null;
  /** Highest event_seq in this page. */
  newest_event_seq: number | null;
  /** Global event cursor high-water (for live tails). */
  cursor: number;
};

/**
 * Walk newest→oldest, keeping only transcript messages, until we fill `limit`
 * or exhaust the table / hit `before_event_seq`.
 */
async function collectTranscriptPage(
  ctx: QueryCtx,
  opts: { limit: number; beforeEventSeq?: number },
): Promise<{ rows: Doc<"messages">[]; has_more: boolean }> {
  const out: Doc<"messages">[] = [];
  let before = opts.beforeEventSeq;
  // Scan more rows than the page size because telemetry is dense.
  const SCAN = Math.min(opts.limit * 20, 400);
  let scanned = 0;
  let hitEnd = false;

  while (out.length < opts.limit && !hitEnd) {
    const beforeBound = before;
    const batch = beforeBound !== undefined
      ? await ctx.db
          .query("messages")
          .withIndex("by_event_seq", (q) => q.lt("event_seq", beforeBound))
          .order("desc")
          .take(SCAN)
      : await ctx.db.query("messages").withIndex("by_event_seq").order("desc").take(SCAN);

    if (batch.length === 0) {
      hitEnd = true;
      break;
    }

    for (const row of batch) {
      scanned += 1;
      if (isTranscriptMessage(row)) {
        out.push(row);
        if (out.length >= opts.limit) break;
      }
    }

    before = batch[batch.length - 1]!.event_seq;
    if (batch.length < SCAN) {
      hitEnd = true;
      break;
    }
    // Safety: don't spin forever on a giant table in one query.
    if (scanned >= 2000) break;
  }

  // has_more if we filled the page (there may still be older transcript rows).
  const has_more = out.length >= opts.limit && !hitEnd;
  return { rows: out, has_more: has_more || (out.length >= opts.limit && scanned >= opts.limit) };
}

/**
 * Most-recent chat page (iMessage-style). Live-query friendly: always the latest
 * `limit` transcript messages, oldest→newest within the page.
 */
export const listRecentMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ChatPage> => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 100);
    const { rows: newestFirst, has_more } = await collectTranscriptPage(ctx, { limit });
    const chronological = newestFirst.slice().reverse();
    return {
      messages: chronological.map(feedMessageOf),
      has_more,
      oldest_event_seq: chronological[0]?.event_seq ?? null,
      newest_event_seq: chronological[chronological.length - 1]?.event_seq ?? null,
      cursor: await currentCursor(ctx),
    };
  },
});

/** Older page strictly before `before_event_seq` (scroll-up load more). */
export const listMessagesBefore = query({
  args: { before_event_seq: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ChatPage> => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 100);
    const { rows: newestFirst, has_more } = await collectTranscriptPage(ctx, {
      limit,
      beforeEventSeq: args.before_event_seq,
    });
    const chronological = newestFirst.slice().reverse();
    return {
      messages: chronological.map(feedMessageOf),
      has_more,
      oldest_event_seq: chronological[0]?.event_seq ?? null,
      newest_event_seq: chronological[chronological.length - 1]?.event_seq ?? null,
      cursor: await currentCursor(ctx),
    };
  },
});

/**
 * Human restore from the history UI — appends a new version equal to `seq`.
 * Browser-only (never reached via `/agent/*`), so it requires the signed-in owner.
 */
export const restoreArtifact = mutation({
  args: { artifact_id: v.string(), seq: v.number(), why: v.string() },
  handler: async (ctx, args): Promise<WriteOutcome> => {
    await requireOwner(ctx);
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

/** Bootstrap: Workspace tab + attach orphan artifacts (CLI / tooling). */
export const ensureWorkspace = mutation({
  args: {},
  handler: async (ctx): Promise<{ tab_id: string; assigned: number }> => {
    return await ctx.runMutation(internal.agentWrites.ensureWorkspace, {});
  },
});
