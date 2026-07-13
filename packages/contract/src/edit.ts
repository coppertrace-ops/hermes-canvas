import { z } from "zod";
import { LIMITS } from "./limits";

/**
 * Edit and anchor schemas (plan §2.2, §2.3).
 *
 * An update is either a whole-document `replace_all` or a targeted `region`
 * edit. Region edits are the defence against the incumbent truncation/overwrite
 * failures (plan C3): the server resolves the anchor against the parent version
 * and records the exact byte range it changed.
 */

/** Anchor by markdown heading text (first exact match, trimmed). */
export const headingAnchorSchema = z.object({
  heading: z.string().min(1),
});

/** Anchor by inclusive 1-based line range. */
export const lineRangeAnchorSchema = z.object({
  start_line: z.number().int().positive(),
  end_line: z.number().int().positive(),
});

export const anchorSchema = z.union([headingAnchorSchema, lineRangeAnchorSchema]);

export const replaceAllEditSchema = z.object({
  mode: z.literal("replace_all"),
  content: z.string(),
});

export const regionEditSchema = z.object({
  mode: z.literal("region"),
  anchor: anchorSchema,
  content: z.string(),
});

export const editSchema = z.discriminatedUnion("mode", [replaceAllEditSchema, regionEditSchema]);

export type HeadingAnchor = z.infer<typeof headingAnchorSchema>;
export type LineRangeAnchor = z.infer<typeof lineRangeAnchorSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type Edit = z.infer<typeof editSchema>;

/** The `why` justification required on every write. */
export const whySchema = z
  .string()
  .trim()
  .min(1, "why is required")
  .max(LIMITS.WHY_MAX_CHARS, `why must be <= ${LIMITS.WHY_MAX_CHARS} chars`);
