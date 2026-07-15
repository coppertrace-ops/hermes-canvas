import { z } from "zod";
import { byteLength } from "./limits";

/**
 * Agent status + memory-mirror wire shapes for the Settings surface (OWNER: LEDGER).
 *
 * These endpoints are PLUGIN INFRASTRUCTURE, not model-facing Canvas tools: the
 * external Hermes gateway reports its own runtime state (`PUT /agent/status`) and
 * mirrors the host's memory store (`PUT /agent/memory`) over the service-token
 * path, and the owner's Settings panel reads them back. They are deliberately kept
 * out of the tool manifest (`manifest.ts`) — the model never calls them — and are
 * documented in the agent-api doc's Infrastructure section instead.
 *
 * As with `job.ts`, these zod schemas are the single source of truth: they
 * validate the wire and type the mutations, so the caps can never be described in
 * one place and enforced differently in another.
 */

// ---------------------------------------------------------------------------
// Caps (infra-local; intentionally NOT in the frozen LIMITS surface, which is
// the Canvas artifact/message/job vocabulary the tool manifest renders).
// ---------------------------------------------------------------------------

/** Max size of a single `PUT /agent/status` body — a small status blob. */
export const AGENT_STATUS_BODY_MAX_BYTES = 16 * 1024;
/** Max entries accepted in one `PUT /agent/memory` bulk sync. */
export const MEMORY_SYNC_MAX_ENTRIES = 500;
/** Max size of a single memory entry's `content`, measured on UTF-8 bytes. */
export const MEMORY_ENTRY_CONTENT_MAX_BYTES = 8 * 1024;

// ---------------------------------------------------------------------------
// PUT /agent/status — the gateway's self-reported runtime state (singleton).
// `reported_at` is server-stamped on write and is therefore NOT part of the
// input body. Unknown keys are stripped (zod default) so a newer gateway that
// reports extra fields is not rejected — infra reporting favours forward-compat.
// ---------------------------------------------------------------------------

export const agentStatusSchema = z.object({
  model: z.string().trim().min(1).max(256),
  provider: z.string().trim().min(1).max(256),
  effort: z.string().max(64).optional(),
  fallbacks: z.array(z.string().max(256)).optional(),
  context: z
    .object({
      used_tokens: z.number().int().nonnegative().optional(),
      max_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  gateway: z
    .object({
      version: z.string().max(128).optional(),
      uptime_s: z.number().nonnegative().optional(),
    })
    .optional(),
  toolsets: z.array(z.string().max(128)).optional(),
  platforms: z.array(z.string().max(128)).optional(),
  sessions_active: z.number().int().nonnegative().optional(),
  memory: z
    .object({
      provider: z.string().max(128).optional(),
      recall_budget: z.number().nonnegative().optional(),
    })
    .optional(),
});
export type AgentStatusInput = z.infer<typeof agentStatusSchema>;

// ---------------------------------------------------------------------------
// PUT /agent/memory — bulk mirror sync of the host's memory store.
// This is a MIRROR of host state, not an append-only ledger: a `full:true` sync
// removes local rows the payload omits (see the mutation). `synced_at` is
// server-stamped; `created_at`/`updated_at` are the host's own timestamps.
// ---------------------------------------------------------------------------

export const memoryEntrySchema = z.object({
  /** The host's stable id for this entry — the upsert key. */
  entry_id: z.string().trim().min(1).max(256),
  content: z
    .string()
    .refine(
      (s) => byteLength(s) <= MEMORY_ENTRY_CONTENT_MAX_BYTES,
      `content must be <= ${MEMORY_ENTRY_CONTENT_MAX_BYTES} bytes`,
    ),
  tags: z.array(z.string().max(128)).optional(),
  source: z.string().max(256).optional(),
  created_at: z.number().int().nonnegative().optional(),
  updated_at: z.number().int().nonnegative().optional(),
});
export type MemoryEntryInput = z.infer<typeof memoryEntrySchema>;

export const memorySyncSchema = z.object({
  entries: z
    .array(memoryEntrySchema)
    .max(MEMORY_SYNC_MAX_ENTRIES, `at most ${MEMORY_SYNC_MAX_ENTRIES} entries per sync`),
  /** When true, rows whose `entry_id` is absent from `entries` are removed. */
  full: z.boolean().optional(),
});
export type MemorySync = z.infer<typeof memorySyncSchema>;
