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
  // Wave 2 (additive union widening): the owner flipped a server-side feature
  // flag. Written in the same mutation as the flag upsert so the audit trail can
  // never disagree with the flag's current state. Never emitted on `/agent/*`.
  "flag_changed",
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
  /**
   * On a rejection event, the true `ApiError.code` that caused the refusal
   * (`oversize`, `not_found`, `validation_failed`, …). The frozen `limit_rejected`
   * kind is a coarse bucket; this field carries the exact reason so machine
   * consumers can branch without the label overstating that a *limit* was hit.
   */
  rejected_code: z.string().optional(),
  /**
   * On a `flag_changed` event, which flag was flipped and to what state. The
   * flip mutation writes both so the audit line is self-describing. Additive and
   * optional; every existing event row (which sets neither) stays valid.
   */
  flag_key: z.string().optional(),
  enabled: z.boolean().optional(),
});
export type EventRefs = z.infer<typeof eventRefsSchema>;
