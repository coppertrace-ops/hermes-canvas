import type { ArtifactRecord, Author } from "@hermes/contract";
import {
  byteLength,
  CanvasError,
  LIMITS,
  planArchiveArtifact,
  planCreateArtifact,
  planUpdateArtifact,
} from "@hermes/contract";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { reject, type WriteOutcome } from "./lib/outcome";
import {
  appendEvent,
  applyPlan,
  getArtifactByKey,
  getVersion,
  nextArtifactKey,
  recentArtifactWrites,
  recentGlobalAgentWrites,
} from "./lib/store";

/**
 * Agent write surface (OWNER: LEDGER, plan §2.2). These are `internalMutation`s
 * invoked by the `/agent/*` HTTP actions after service-token auth + zod
 * validation. Each is a thin wrapper over the contract's pure `plan*` functions;
 * the sequencer/contention/validation/rate-limit rules live in `@hermes/contract`,
 * so this file cannot enforce them differently.
 *
 * Rejections are RETURNED (see `lib/outcome.ts`), never thrown, so the recorded
 * `limit_rejected` event survives the transaction.
 */

const authorArg = v.optional(v.union(v.literal("human"), v.literal("agent")));

const editValidator = v.union(
  v.object({ mode: v.literal("replace_all"), content: v.string() }),
  v.object({
    mode: v.literal("region"),
    anchor: v.union(
      v.object({ heading: v.string() }),
      v.object({ start_line: v.number(), end_line: v.number() }),
    ),
    content: v.string(),
  }),
);

function toArtifactRecord(doc: Doc<"artifacts">): ArtifactRecord {
  return {
    id: doc.art_key,
    tab_id: doc.tab_id,
    type: doc.type,
    title: doc.title,
    status: doc.status,
    created_by: doc.created_by,
    head_seq: doc.head_seq,
    created_at: doc.created_at,
  };
}

// ---------------------------------------------------------------------------
// POST /agent/artifacts
// ---------------------------------------------------------------------------
export const createArtifact = internalMutation({
  args: {
    type: v.union(v.literal("markdown"), v.literal("mermaid"), v.literal("html-static"), v.literal("board")),
    title: v.string(),
    tab_id: v.optional(v.string()),
    content: v.string(),
    why: v.string(),
    author: authorArg,
    agent_turn_id: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WriteOutcome> => {
    const now = Date.now();
    const author: Author = args.author ?? "agent";
    const artKey = await nextArtifactKey(ctx);
    const recentGlobal = await recentGlobalAgentWrites(ctx, now);
    let plan;
    try {
      plan = planCreateArtifact({
        artifactId: artKey,
        input: { type: args.type, title: args.title, tab_id: args.tab_id, content: args.content, why: args.why },
        author,
        agentTurnId: args.agent_turn_id,
        now,
        recentArtifactWrites: [],
        recentGlobalWrites: recentGlobal,
      });
    } catch (e) {
      return reject(ctx, e, author, { artifact_id: artKey, tab_id: args.tab_id }, now);
    }
    await ctx.db.insert("artifacts", {
      art_key: artKey,
      tab_id: args.tab_id,
      type: args.type,
      title: args.title,
      status: "active",
      created_by: author,
      head_seq: plan.result.head_seq,
      created_at: now,
    });
    await applyPlan(ctx, plan);
    return { ok: true, result: plan.result };
  },
});

// ---------------------------------------------------------------------------
// PATCH /agent/artifacts/:id
// ---------------------------------------------------------------------------
export const updateArtifact = internalMutation({
  args: {
    artifact_id: v.string(),
    parent_seq: v.number(),
    why: v.string(),
    edit: editValidator,
    author: authorArg,
    agent_turn_id: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WriteOutcome> => {
    const now = Date.now();
    const author: Author = args.author ?? "agent";
    const doc = await getArtifactByKey(ctx, args.artifact_id);
    if (!doc) {
      return reject(ctx, CanvasError.notFound(`artifact ${args.artifact_id}`), author, { artifact_id: args.artifact_id }, now);
    }
    let parentContent = "";
    if (args.edit.mode === "region") {
      const parent = await getVersion(ctx, args.artifact_id, args.parent_seq);
      if (!parent) {
        return reject(
          ctx,
          CanvasError.validation(`parent_seq ${args.parent_seq} not found for artifact ${args.artifact_id}`),
          author,
          { artifact_id: args.artifact_id },
          now,
        );
      }
      parentContent = parent.content;
    }
    const recentArt = await recentArtifactWrites(ctx, args.artifact_id, now);
    const recentGlobal = await recentGlobalAgentWrites(ctx, now);
    let plan;
    try {
      plan = planUpdateArtifact({
        artifact: toArtifactRecord(doc),
        parentContent,
        input: { parent_seq: args.parent_seq, why: args.why, edit: args.edit },
        author,
        agentTurnId: args.agent_turn_id,
        now,
        recentArtifactWrites: recentArt,
        recentGlobalWrites: recentGlobal,
      });
    } catch (e) {
      return reject(ctx, e, author, { artifact_id: args.artifact_id }, now);
    }
    await applyPlan(ctx, plan);
    return { ok: true, result: plan.result };
  },
});

// ---------------------------------------------------------------------------
// POST /agent/artifacts/:id/archive
// ---------------------------------------------------------------------------
export const archiveArtifact = internalMutation({
  args: { artifact_id: v.string(), why: v.string(), author: authorArg },
  handler: async (ctx, args): Promise<WriteOutcome> => {
    const now = Date.now();
    const author: Author = args.author ?? "agent";
    const doc = await getArtifactByKey(ctx, args.artifact_id);
    if (!doc) {
      return reject(ctx, CanvasError.notFound(`artifact ${args.artifact_id}`), author, { artifact_id: args.artifact_id }, now);
    }
    const plan = planArchiveArtifact({ artifact: toArtifactRecord(doc), why: args.why, author, now });
    await applyPlan(ctx, plan);
    return { ok: true, result: plan.result };
  },
});

// ---------------------------------------------------------------------------
// POST /agent/messages
// ---------------------------------------------------------------------------
export const postMessage = internalMutation({
  args: {
    text: v.optional(v.string()),
    stream_id: v.optional(v.string()),
    delta: v.optional(v.string()),
    done: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("human"), v.literal("agent"))),
    turn_id: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true; message_id: string } | { ok: false; error: ReturnType<typeof CanvasError.oversize>["error"] }> => {
    const now = Date.now();
    const role = args.role ?? "agent";

    // Whole message.
    if (args.text !== undefined) {
      if (byteLength(args.text) > LIMITS.MESSAGE_BYTES) {
        const out = await reject(
          ctx,
          CanvasError.oversize({ limit: "MESSAGE_BYTES", limit_value: LIMITS.MESSAGE_BYTES, actual: byteLength(args.text), unit: "bytes" }),
          role,
          {},
          now,
        );
        return out as { ok: false; error: ReturnType<typeof CanvasError.oversize>["error"] };
      }
      const seq = await appendEvent(ctx, { kind: "message", actor: role, refs: {}, at: now });
      const id = await ctx.db.insert("messages", { role, body: args.text, status: "complete", turn_id: args.turn_id, event_seq: seq, at: now });
      return { ok: true, message_id: id };
    }

    // Streaming delta.
    if (args.stream_id === undefined || args.delta === undefined) {
      throw CanvasError.validation("message must provide {text} or {stream_id, delta}");
    }
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_stream", (q) => q.eq("stream_id", args.stream_id))
      .unique();
    if (!existing) {
      const seq = await appendEvent(ctx, { kind: "message", actor: role, refs: {}, at: now });
      const id = await ctx.db.insert("messages", {
        role,
        body: args.delta,
        status: args.done ? "complete" : "streaming",
        turn_id: args.turn_id,
        stream_id: args.stream_id,
        event_seq: seq,
        at: now,
      });
      return { ok: true, message_id: id };
    }
    const nextBody = existing.body + args.delta;
    if (byteLength(nextBody) > LIMITS.MESSAGE_BYTES) {
      const out = await reject(
        ctx,
        CanvasError.oversize({ limit: "MESSAGE_BYTES", limit_value: LIMITS.MESSAGE_BYTES, actual: byteLength(nextBody), unit: "bytes" }),
        role,
        { message_id: existing._id },
        now,
      );
      return out as { ok: false; error: ReturnType<typeof CanvasError.oversize>["error"] };
    }
    await ctx.db.patch(existing._id, { body: nextBody, status: args.done ? "complete" : "streaming" });
    return { ok: true, message_id: existing._id };
  },
});

// ---------------------------------------------------------------------------
// PUT /agent/tabs, PATCH /agent/tabs/:id
// ---------------------------------------------------------------------------
export const createTab = internalMutation({
  args: { title: v.string(), order: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ tab_id: string }> => {
    const now = Date.now();
    const count = (await ctx.db.query("tabs").collect()).length;
    const id = await ctx.db.insert("tabs", {
      title: args.title,
      order: args.order ?? count,
      status: "active",
      created_at: now,
    });
    await appendEvent(ctx, { kind: "tab_changed", actor: "agent", refs: { tab_id: id }, at: now });
    return { tab_id: id };
  },
});

export const patchTab = internalMutation({
  args: {
    tab_id: v.id("tabs"),
    title: v.optional(v.string()),
    order: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args): Promise<WriteOutcome | { ok: true }> => {
    const now = Date.now();
    const tab = await ctx.db.get(args.tab_id);
    if (!tab) return reject(ctx, CanvasError.notFound(`tab ${args.tab_id}`), "agent", { tab_id: args.tab_id }, now);
    const patch: Partial<Doc<"tabs">> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.order !== undefined) patch.order = args.order;
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(args.tab_id, patch);
    await appendEvent(ctx, { kind: "tab_changed", actor: "agent", refs: { tab_id: args.tab_id }, at: now });
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// PUT /agent/jobs/:key, POST /agent/jobs/:key/runs
// ---------------------------------------------------------------------------
export const registerJob = internalMutation({
  args: {
    key: v.string(),
    name: v.string(),
    schedule_cron: v.string(),
    description: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"))),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const fields = {
      key: args.key,
      name: args.name,
      schedule_cron: args.schedule_cron,
      description: args.description ?? "",
      source: args.source ?? "",
      status: args.status ?? ("active" as const),
      updated_at: now,
    };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("jobs", fields);
    await appendEvent(ctx, { kind: "job_registered", actor: "agent", refs: { job_key: args.key }, at: now });
    return { ok: true };
  },
});

export const reportRun = internalMutation({
  args: {
    key: v.string(),
    run_id: v.string(),
    status: v.union(v.literal("started"), v.literal("succeeded"), v.literal("failed")),
    started_at: v.number(),
    finished_at: v.optional(v.number()),
    summary: v.optional(v.string()),
    log_tail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WriteOutcome | { ok: true }> => {
    const now = Date.now();
    const job = await ctx.db
      .query("jobs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!job) return reject(ctx, CanvasError.notFound(`job ${args.key}`), "agent", { job_key: args.key }, now);

    // Upsert the run by (job_key, run_id): started -> insert, later status -> patch.
    const existing = await ctx.db
      .query("job_runs")
      .withIndex("by_job_run", (q) => q.eq("job_key", args.key).eq("run_id", args.run_id))
      .unique();
    const fields = {
      job_key: args.key,
      run_id: args.run_id,
      status: args.status,
      started_at: args.started_at,
      finished_at: args.finished_at,
      summary: args.summary,
      log_tail: args.log_tail,
    };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("job_runs", fields);
    await appendEvent(ctx, { kind: "job_run", actor: "agent", refs: { job_key: args.key }, at: now });
    return { ok: true };
  },
});
