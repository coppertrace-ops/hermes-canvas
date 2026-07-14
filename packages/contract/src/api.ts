import { z } from "zod";
import { artifactStatusSchema, artifactTypeSchema, authorSchema, renderStateSchema } from "./artifact";
import { editSchema, whySchema } from "./edit";
import { eventKindSchema, eventRefsSchema } from "./events";
import { LIMITS } from "./limits";
import { resolvedActionSchema } from "./resolvedAction";

/**
 * Request/response bodies for the `/agent/*` HTTP surface (plan §2.2).
 *
 * These zod schemas are the single source: they validate the wire, type the
 * connector, and generate the tool manifest. The contract cannot drift in three
 * places because there is only one place.
 */

// ---------------------------------------------------------------------------
// Messages — POST /agent/messages
// ---------------------------------------------------------------------------

/** Post a complete assistant message in one shot. */
export const postMessageWholeSchema = z.object({
  text: z.string().max(LIMITS.MESSAGE_BYTES, `message must be <= ${LIMITS.MESSAGE_BYTES} bytes`),
});

/** Stream an assistant message as coalesced deltas keyed by `stream_id`. */
export const postMessageStreamSchema = z.object({
  stream_id: z.string().min(1),
  delta: z.string(),
  done: z.boolean().optional(),
});

export const postMessageSchema = z.union([postMessageWholeSchema, postMessageStreamSchema]);
export type PostMessage = z.infer<typeof postMessageSchema>;

// ---------------------------------------------------------------------------
// Artifacts — POST /agent/artifacts, PATCH /agent/artifacts/:id, archive
// ---------------------------------------------------------------------------

export const createArtifactSchema = z.object({
  type: artifactTypeSchema,
  title: z.string().trim().min(1).max(LIMITS.TITLE_MAX_CHARS),
  tab_id: z.string().optional(),
  content: z.string(),
  why: whySchema,
});
export type CreateArtifact = z.infer<typeof createArtifactSchema>;

export const updateArtifactSchema = z.object({
  parent_seq: z.number().int().nonnegative(),
  why: whySchema,
  edit: editSchema,
});
export type UpdateArtifact = z.infer<typeof updateArtifactSchema>;

export const archiveArtifactSchema = z.object({
  why: whySchema,
});
export type ArchiveArtifact = z.infer<typeof archiveArtifactSchema>;

// ---------------------------------------------------------------------------
// Write result — returned by create / update / archive / restore
// ---------------------------------------------------------------------------

/** The structured result every artifact write returns, so Hermes can chain edits. */
export const writeResultSchema = z.object({
  artifact_id: z.string(),
  /** New head after this write. */
  head_seq: z.number().int().nonnegative(),
  /** The seq this write produced. */
  seq: z.number().int().nonnegative(),
  /** True when parent_seq != head at write time — the write still landed. */
  contended: z.boolean(),
  render_state: renderStateSchema,
  resolved_action: resolvedActionSchema,
});
export type WriteResult = z.infer<typeof writeResultSchema>;

// ---------------------------------------------------------------------------
// Reads — GET /agent/artifacts, GET /agent/artifacts/:id?seq=
// ---------------------------------------------------------------------------

export const artifactSummarySchema = z.object({
  artifact_id: z.string(),
  tab_id: z.string().optional(),
  type: artifactTypeSchema,
  title: z.string(),
  status: artifactStatusSchema,
  head_seq: z.number().int().nonnegative(),
});
export type ArtifactSummary = z.infer<typeof artifactSummarySchema>;

export const artifactVersionSchema = z.object({
  artifact_id: z.string(),
  seq: z.number().int().nonnegative(),
  parent_seq: z.number().int().nonnegative().nullable(),
  content: z.string(),
  content_size: z.number().int().nonnegative(),
  author: authorSchema,
  why: z.string().optional(),
  contended: z.boolean(),
  render_state: renderStateSchema,
  resolved_action: resolvedActionSchema,
  created_at: z.number().int().nonnegative(),
});
export type ArtifactVersion = z.infer<typeof artifactVersionSchema>;

/** GET /agent/artifacts/:id?seq= — the summary plus the requested (or head) version. */
export const artifactReadSchema = z.object({
  artifact: artifactSummarySchema,
  version: artifactVersionSchema,
});
export type ArtifactRead = z.infer<typeof artifactReadSchema>;

// ---------------------------------------------------------------------------
// Updates feed — GET /agent/updates?cursor= (poll fallback for the WS sub)
// ---------------------------------------------------------------------------

export const feedMessageSchema = z.object({
  message_id: z.string(),
  role: z.enum(["human", "agent"]),
  body: z.string(),
  status: z.enum(["streaming", "complete"]),
  at: z.number().int().nonnegative(),
  /** Attachment ids bound to this message (owner uploads). Absent when none. */
  attachments: z.array(z.string()).optional(),
});
export type FeedMessage = z.infer<typeof feedMessageSchema>;

export const feedEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  kind: eventKindSchema,
  actor: z.enum(["human", "agent", "system"]),
  refs: eventRefsSchema,
  at: z.number().int().nonnegative(),
});
export type FeedEvent = z.infer<typeof feedEventSchema>;

export const updatesResponseSchema = z.object({
  /** Opaque cursor to pass to the next poll; monotonic global event seq. */
  cursor: z.number().int().nonnegative(),
  messages: z.array(feedMessageSchema),
  events: z.array(feedEventSchema),
});
export type UpdatesResponse = z.infer<typeof updatesResponseSchema>;

export const updatesQuerySchema = z.object({
  cursor: z.coerce.number().int().nonnegative().default(0),
});
export type UpdatesQuery = z.infer<typeof updatesQuerySchema>;
