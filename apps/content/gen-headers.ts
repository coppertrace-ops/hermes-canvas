/**
 * Generate `apps/content/vercel.json` from @hermes/policy (OWNER: WARDEN app +
 * ATLAS deploy config, spec §2.2/§2.3).
 *
 * Static export ignores Next `headers()`, so the content-origin CSP + nosniff are
 * applied by Vercel from `vercel.json`. Those header STRINGS must be the exact
 * `@hermes/policy` output — never hand-copied — so this script writes them, and
 * `headers.test.ts` guards that the committed file stays in sync with policy.
 *
 * Run: `pnpm --filter @hermes/content gen-headers` (also runs in `build`). Set
 * `NEXT_PUBLIC_APP_ORIGIN` to the target app origin before a deploy whose app host
 * differs from the default, then commit the regenerated `vercel.json`.
 *
 * Vercel parses `vercel.json` BEFORE the build, so the committed file — not a
 * build-time regen — is what applies on deploy. The build-step regen only keeps
 * the committed file honest locally.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildContentCsp } from "@hermes/policy";
import { APP_ORIGIN } from "./appOrigin";

export function buildVercelConfig(appOrigin: string) {
  return {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: null,
    installCommand: "cd ../.. && corepack enable && corepack pnpm install",
    buildCommand: "cd ../.. && corepack enable && corepack pnpm --filter @hermes/content build",
    outputDirectory: "out",
    headers: [
      {
        // Every path on the content origin (spec §2.2 "headers on every path").
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildContentCsp(appOrigin) },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ],
  };
}

// Only write when run directly (not when imported by the guard test).
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = join(here, "vercel.json");
  const config = buildVercelConfig(APP_ORIGIN);
  writeFileSync(target, JSON.stringify(config, null, 2) + "\n");
  console.log(`wrote ${target} (app origin: ${APP_ORIGIN})`);
}
