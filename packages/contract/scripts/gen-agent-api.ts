/**
 * Regenerate `docs/agent-api.md` from the contract manifest.
 * Run: `node --experimental-strip-types packages/contract/scripts/gen-agent-api.ts`
 * (wired as `pnpm --filter @hermes/contract gen:agent-api`).
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAgentApiMarkdown } from "../src/manifest.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../docs/agent-api.md");
writeFileSync(out, renderAgentApiMarkdown(), "utf8");
process.stdout.write(`wrote ${out}\n`);
