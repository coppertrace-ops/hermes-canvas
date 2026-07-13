import { z } from "zod";
import { convexUrlSchema, originSchema } from "./shared";

/**
 * Browser-exposed environment. Everything here ships to the client, so it must
 * contain NO secrets — only public URLs and non-sensitive flags. Next.js inlines
 * `NEXT_PUBLIC_*` at build time.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: convexUrlSchema,
  /** App origin (authenticated UI). */
  NEXT_PUBLIC_APP_ORIGIN: originSchema.optional(),
  /** Sandbox content origin that serves artifact HTML (a separate *.vercel.app). */
  NEXT_PUBLIC_CONTENT_ORIGIN: originSchema.optional(),
  /**
   * Demo mode banner flag for the UI. This is a *display* hint only; it grants no
   * access. Real auth bypass is gated server-side (see index.ts::isDemoBypassEnabled).
   */
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse client env from an explicit record (Next requires static references to
 * `process.env.NEXT_PUBLIC_*`, so callers pass them in rather than us reading
 * `process.env` dynamically).
 */
export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  return clientEnvSchema.parse(source);
}
