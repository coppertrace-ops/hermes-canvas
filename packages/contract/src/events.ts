import { z } from "zod";

/**
 * Event log vocabulary (plan §3).
 *
 * Events are written in the SAME mutation as the action they describe, so the
 * activity log can never disagree with the data. Rejections (`limit_rejected`)
 * are events too: a blocked write is evidence, not silence.
 */

export const eventKindSchema = z.enum([
  "message",
  "artifact_created",
  "artifact_updated",
  "artifact_archived",
  "tab_changed",
  "job_registered",
  "job_run",
  "auth",
  "limit_rejected",
]);
export type EventKind = z.infer<typeof eventKindSchema>;

export const eventActorSchema = z.enum(["human", "agent", "system"]);
export type EventActor = z.infer<typeof eventActorSchema>;

/** Cross-references an event may carry (all optional; set per kind). */
export const eventRefsSchema = z.object({
  artifact_id: z.string().optional(),
  message_id: z.string().optional(),
  job_key: z.string().optional(),
  version_seq: z.number().int().nonnegative().optional(),
  tab_id: z.string().optional(),
});
export type EventRefs = z.infer<typeof eventRefsSchema>;
