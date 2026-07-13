import { z } from "zod";

/**
 * `resolved_action` — the server's record of what a write ACTUALLY did (plan
 * §2.2 "Ground truth", §3). Written by the server from the resolved outcome, not
 * from the agent's self-description. Paired with the required `why`, this is the
 * audit pair: stated intent vs. recorded effect, shown side by side.
 *
 * The builder that populates it lives in `region.ts` / `plan.ts`; this module is
 * just the frozen shape.
 */

export const resolvedOpSchema = z.enum([
  "create",
  "replace_all",
  "region",
  "restore",
  "archive",
]);
export type ResolvedOp = z.infer<typeof resolvedOpSchema>;

/** Half-open byte range [start, end) into a snapshot. */
export const byteRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type ByteRange = z.infer<typeof byteRangeSchema>;

export const resolvedActionSchema = z.object({
  op: resolvedOpSchema,
  /** Artifact id the write actually landed on (stable identity). */
  target: z.string().optional(),
  /** Human-readable description of the resolved region, e.g. `heading:"Auth"` or `lines 12-18`. */
  region: z.string().optional(),
  /** Byte range in the NEW snapshot occupied by the written content (region edits). */
  byte_range: byteRangeSchema.optional(),
  /** For restore: the seq whose content was reinstated. */
  restored_from_seq: z.number().int().nonnegative().optional(),
});
export type ResolvedAction = z.infer<typeof resolvedActionSchema>;
