import { z } from "zod";
import { LIMITS } from "./limits";

/**
 * Tab shapes (plan §2.2, §3). Tabs group artifacts; removal is archive-only.
 */

export const tabTitleSchema = z.string().trim().min(1).max(LIMITS.TITLE_MAX_CHARS);

export const createTabSchema = z.object({
  title: tabTitleSchema,
  /** Explicit order; when omitted the server appends after the current max. */
  order: z.number().int().optional(),
});
export type CreateTab = z.infer<typeof createTabSchema>;

export const patchTabSchema = z
  .object({
    title: tabTitleSchema.optional(),
    order: z.number().int().optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine((p) => p.title !== undefined || p.order !== undefined || p.status !== undefined, {
    message: "patch must change at least one of title/order/status",
  });
export type PatchTab = z.infer<typeof patchTabSchema>;
