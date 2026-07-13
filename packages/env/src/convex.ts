import { z } from "zod";
import { emailSchema, nodeEnvSchema, originSchema, serviceTokenSchema } from "./shared.js";

/**
 * Environment consumed *inside Convex functions* at runtime. These are set as
 * Convex deployment environment variables (`npx convex env set ...`), never in
 * the repo. Validate lazily at call sites — do not throw at module load, because
 * some vars (JWT keys) are provisioned by `@convex-dev/auth` after first deploy.
 */
export const convexEnvSchema = z.object({
  /** The single permitted owner account (closed-owner auth, allowlist-of-one). */
  OWNER_EMAIL: emailSchema,
  /**
   * Bearer token for the external Hermes agent's /agent/* surface. Stored hashed
   * and compared constant-time by LEDGER's HTTP actions. Shape-checked here only.
   */
  HERMES_SERVICE_TOKEN: serviceTokenSchema.optional(),
  /** Public site URL of the Convex HTTP actions host (…convex.site). Set by CLI. */
  SITE_URL: z.string().url().optional(),
  /** App origin allowed to talk to Convex Auth / postMessage into the sandbox. */
  APP_ORIGIN: originSchema.optional(),
  /** Sandbox content origin (separate *.vercel.app). */
  CONTENT_ORIGIN: originSchema.optional(),
  /** JWT signing material provisioned by @convex-dev/auth. Never printed. */
  JWT_PRIVATE_KEY: z.string().optional(),
  JWKS: z.string().optional(),
  /**
   * Non-prod demo bypass switch. Honored ONLY when NODE_ENV !== "production".
   * See index.ts::isDemoBypassEnabled — this is defense-in-depth, not the gate.
   */
  DEMO_AUTH_BYPASS: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  NODE_ENV: nodeEnvSchema.optional(),
});

export type ConvexEnv = z.infer<typeof convexEnvSchema>;

/** Validate the auth-critical subset. Call at owner sign-in, not at import. */
export function requireOwnerEmail(source: Record<string, string | undefined> = process.env): string {
  const parsed = z.object({ OWNER_EMAIL: emailSchema }).parse(source);
  return parsed.OWNER_EMAIL.toLowerCase();
}

export function parseConvexEnv(source: Record<string, string | undefined> = process.env): ConvexEnv {
  return convexEnvSchema.parse(source);
}
