import type { PlannedEvent, WritePlan } from "@hermes/contract";
import { LIMITS } from "@hermes/contract";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * DB-facing store helpers (OWNER: LEDGER).
 *
 * These mirror `CanvasCore` from `@hermes/contract` against `ctx.db`, so the
 * Convex mutations and the append-only in-memory reference core apply the exact
 * same pure `WritePlan`s. The plan objects are computed by the contract's pure
 * `plan*` functions; this module only performs the I/O the plan describes.
 *
 * Append-only invariant: this file inserts into `versions`/`events` and NEVER
 * patches or deletes them. The only mutable pointers are `artifacts.head_seq`,
 * `artifacts.status`, and the `counters` rows.
 */

/** Atomically allocate the next value of a named counter (strict monotonic). */
export async function allocCounter(ctx: MutationCtx, name: string): Promise<number> {
  const row = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (!row) {
    await ctx.db.insert("counters", { name, value: 1 });
    return 1;
  }
  const next = row.value + 1;
  await ctx.db.patch(row._id, { value: next });
  return next;
}

export async function nextArtifactKey(ctx: MutationCtx): Promise<string> {
  return `art_${await allocCounter(ctx, "artifact")}`;
}

/** Append one event with the next global seq. */
export async function appendEvent(ctx: MutationCtx, e: PlannedEvent): Promise<number> {
  const seq = await allocCounter(ctx, "event_seq");
  await ctx.db.insert("events", { ...e, seq });
  return seq;
}

export async function getArtifactByKey(ctx: QueryCtx, artKey: string): Promise<Doc<"artifacts"> | null> {
  return ctx.db
    .query("artifacts")
    .withIndex("by_art_key", (q) => q.eq("art_key", artKey))
    .unique();
}

export async function getVersion(ctx: QueryCtx, artKey: string, seq: number): Promise<Doc<"versions"> | null> {
  return ctx.db
    .query("versions")
    .withIndex("by_artifact_seq", (q) => q.eq("artifact_id", artKey).eq("seq", seq))
    .unique();
}

/** Write timestamps for one artifact within the rate window. */
export async function recentArtifactWrites(ctx: QueryCtx, artKey: string, now: number): Promise<number[]> {
  const cutoff = now - LIMITS.RATE_WINDOW_MS;
  const rows = await ctx.db
    .query("versions")
    .withIndex("by_artifact_time", (q) => q.eq("artifact_id", artKey).gt("created_at", cutoff))
    .collect();
  return rows.map((r) => r.created_at);
}

/** Agent write timestamps across all artifacts within the rate window. */
export async function recentGlobalAgentWrites(ctx: QueryCtx, now: number): Promise<number[]> {
  const cutoff = now - LIMITS.RATE_WINDOW_MS;
  const rows = await ctx.db
    .query("versions")
    .withIndex("by_author_time", (q) => q.eq("author", "agent").gt("created_at", cutoff))
    .collect();
  return rows.map((r) => r.created_at);
}

/**
 * Apply a validated WritePlan (version insert + head/status pointer move + event
 * appends). The `newArtifact` case is handled by the create mutation, which must
 * insert the artifact row before computing the plan; here we move pointers on an
 * existing artifact.
 */
export async function applyPlan(ctx: MutationCtx, plan: WritePlan): Promise<void> {
  const artKey = plan.result.artifact_id;
  const artifact = await getArtifactByKey(ctx, artKey);
  if (artifact) {
    const patch: Partial<Doc<"artifacts">> = {};
    if (plan.newHeadSeq !== undefined) patch.head_seq = plan.newHeadSeq;
    if (plan.statusChange !== undefined) patch.status = plan.statusChange;
    if (Object.keys(patch).length > 0) await ctx.db.patch(artifact._id, patch);
  }
  if (plan.version) {
    await ctx.db.insert("versions", {
      artifact_id: plan.version.artifact_id,
      seq: plan.version.seq,
      parent_seq: plan.version.parent_seq,
      content: plan.version.content,
      content_size: plan.version.content_size,
      author: plan.version.author,
      agent_turn_id: plan.version.agent_turn_id,
      why: plan.version.why,
      contended: plan.version.contended,
      render_state: plan.version.render_state,
      resolved_action: plan.version.resolved_action,
      created_at: plan.version.created_at,
    });
  }
  for (const e of plan.events) await appendEvent(ctx, e);
}
