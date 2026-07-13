import { z } from "zod";
import { clientEnvSchema } from "./client.js";
import { nodeEnvSchema } from "./shared.js";

/**
 * Next.js server-side environment (the `web` app). Includes the client vars plus
 * server-only, non-secret configuration. Provider secrets live in Convex env, not
 * here — the browser talks to Convex directly, so the Next server holds almost no
 * secret state at MVP.
 */
export const serverEnvSchema = clientEnvSchema.extend({
  NODE_ENV: nodeEnvSchema,
  /** Convex deployment identifier used by the Convex CLI (e.g. "dev:name" / "prod:name"). */
  CONVEX_DEPLOYMENT: z.string().optional(),
  /**
   * Explicit opt-in to the local demo auth bypass. Ignored in production (see
   * index.ts::isDemoBypassEnabled). Never set this in a deployed environment.
   */
  DEMO_AUTH_BYPASS: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse(source);
}
