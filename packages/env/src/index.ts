export * from "./shared";
export * from "./client";
export * from "./server";
export * from "./convex";

/**
 * Central, production-safe gate for the local/demo auth bypass.
 *
 * The bypass is a developer convenience only. It is honored **exclusively** when:
 *   1. NODE_ENV is not "production", AND
 *   2. DEMO_AUTH_BYPASS === "true" is explicitly set.
 *
 * Both Next (server) and Convex read the same rule via this function, so there is
 * one decision point, not two. On Vercel/Convex production, NODE_ENV === "production"
 * makes this return false regardless of any other variable — the bypass can never
 * be the default in a deployed owner environment.
 */
export function isDemoBypassEnabled(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const nodeEnv = source.NODE_ENV ?? "development";
  const vercelEnv = source.VERCEL_ENV; // "production" | "preview" | "development"
  if (nodeEnv === "production" || vercelEnv === "production") return false;
  return source.DEMO_AUTH_BYPASS === "true";
}

/** The synthetic identity used by the demo bypass. Never a real credential. */
export const DEMO_OWNER_IDENTITY = {
  email: "demo-owner@localhost",
  name: "Demo Owner",
} as const;
