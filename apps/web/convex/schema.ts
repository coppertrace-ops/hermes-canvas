import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema (OWNER: LEDGER, plan §3).
 *
 * Mirrors the record shapes in `@hermes/contract` (`records.ts`) field-for-field.
 * The contract is the single source of truth for the shapes; this file is the
 * Convex projection of them, plus the indexes the mutations/queries need.
 *
 * Append-only tables (`versions`, `events`) are never patched or deleted by any
 * function — restore appends a new version, archive flips an artifact pointer.
 * `auth*` and `files*` tables are owned by ATLAS / COURIER respectively and live
 * in their own schema fragments; they are intentionally absent here.
 */

const artifactType = v.union(
  v.literal("markdown"),
  v.literal("mermaid"),
  v.literal("html-static"),
  v.literal("board"),
);
const author = v.union(v.literal("human"), v.literal("agent"));
const renderState = v.union(v.literal("ok"), v.literal("render_error"));

const resolvedAction = v.object({
  op: v.union(
    v.literal("create"),
    v.literal("replace_all"),
    v.literal("region"),
    v.literal("restore"),
    v.literal("archive"),
  ),
  target: v.optional(v.string()),
  region: v.optional(v.string()),
  byte_range: v.optional(v.object({ start: v.number(), end: v.number() })),
  restored_from_seq: v.optional(v.number()),
});

export default defineSchema({
  artifacts: defineTable({
    /** Stable public id (`art_N`) — the API/versions key; identity never changes. */
    art_key: v.string(),
    tab_id: v.optional(v.string()),
    type: artifactType,
    title: v.string(),
    status: v.union(v.literal("active"), v.literal("archived")),
    created_by: author,
    head_seq: v.number(),
    created_at: v.number(),
  })
    .index("by_art_key", ["art_key"])
    .index("by_status", ["status"]),

  versions: defineTable({
    artifact_id: v.string(), // == artifacts.art_key
    seq: v.number(),
    parent_seq: v.union(v.number(), v.null()),
    content: v.string(),
    content_size: v.number(),
    author,
    agent_turn_id: v.optional(v.string()),
    why: v.optional(v.string()),
    contended: v.boolean(),
    render_state: renderState,
    resolved_action: resolvedAction,
    created_at: v.number(),
  })
    .index("by_artifact_seq", ["artifact_id", "seq"])
    .index("by_artifact_time", ["artifact_id", "created_at"])
    .index("by_author_time", ["author", "created_at"]),

  events: defineTable({
    seq: v.number(), // global, strictly increasing (the updates cursor)
    kind: v.union(
      v.literal("message"),
      v.literal("artifact_created"),
      v.literal("artifact_updated"),
      v.literal("artifact_archived"),
      v.literal("tab_changed"),
      v.literal("job_registered"),
      v.literal("job_run"),
      v.literal("auth"),
      v.literal("limit_rejected"),
    ),
    actor: v.union(v.literal("human"), v.literal("agent"), v.literal("system")),
    refs: v.object({
      artifact_id: v.optional(v.string()),
      message_id: v.optional(v.string()),
      job_key: v.optional(v.string()),
      version_seq: v.optional(v.number()),
      tab_id: v.optional(v.string()),
    }),
    at: v.number(),
  }).index("by_seq", ["seq"]),

  /** Single-row counter for the global event seq (strict monotonic allocation). */
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  messages: defineTable({
    role: v.union(v.literal("human"), v.literal("agent")),
    body: v.string(),
    status: v.union(v.literal("streaming"), v.literal("complete")),
    turn_id: v.optional(v.string()),
    stream_id: v.optional(v.string()),
    event_seq: v.number(),
    at: v.number(),
  })
    .index("by_event_seq", ["event_seq"])
    .index("by_stream", ["stream_id"]),

  tabs: defineTable({
    title: v.string(),
    order: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    created_at: v.number(),
  }),

  jobs: defineTable({
    key: v.string(),
    name: v.string(),
    schedule_cron: v.string(),
    description: v.string(),
    source: v.string(),
    status: v.union(v.literal("active"), v.literal("paused")),
    updated_at: v.number(),
  }).index("by_key", ["key"]),

  job_runs: defineTable({
    job_key: v.string(),
    run_id: v.string(),
    status: v.union(v.literal("started"), v.literal("succeeded"), v.literal("failed")),
    started_at: v.number(),
    finished_at: v.optional(v.number()),
    summary: v.optional(v.string()),
    log_tail: v.optional(v.string()),
  })
    .index("by_job", ["job_key"])
    .index("by_job_run", ["job_key", "run_id"]),

  // -------------------------------------------------------------------------
  // CHRONICLE (plan §3 changed-since-last-looked; §8 G4 readership test).
  // Additive-only tables (plan §9), owned by CHRONICLE and consumed only by
  // `lastSeen.ts` / `metrics.ts`. Kept here because Convex derives its single
  // typed DataModel from this file; no LEDGER definition above is touched.
  // -------------------------------------------------------------------------

  /** One row per artifact (single owner): the head seq the owner last saw. */
  last_seen: defineTable({
    artifact_id: v.string(), // == artifacts.art_key
    seq: v.number(),
    at: v.number(),
  }).index("by_artifact", ["artifact_id"]),

  /** Readership-test instrumentation events (append-only; never patched). */
  metrics: defineTable({
    kind: v.union(
      v.literal("diff_opened"),
      v.literal("badge_clicked"),
      v.literal("restore_performed"),
      v.literal("artifact_first_viewed"),
      v.literal("merge_prompt_opened"),
      v.literal("merge_resolved"),
    ),
    artifact_id: v.optional(v.string()),
    tab_id: v.optional(v.string()),
    seq: v.optional(v.number()),
    from_seq: v.optional(v.number()),
    time_to_first_view_ms: v.optional(v.number()),
    resolution: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_kind", ["kind"])
    .index("by_at", ["at"]),
});
