import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContentCsp } from "@hermes/policy";
import { APP_ORIGIN } from "./appOrigin";
import { buildVercelConfig } from "./gen-headers";

/**
 * Drift guard (spec §2.2 "generated, not hand-copied"): the committed
 * `vercel.json` header strings MUST equal `@hermes/policy` output. A hand-edit
 * that weakens the CSP fails here.
 */

const here = dirname(fileURLToPath(import.meta.url));
const vercel = JSON.parse(readFileSync(join(here, "vercel.json"), "utf8"));

function headerRule() {
  const rule = vercel.headers.find((h: { source: string }) => h.source === "/(.*)");
  if (!rule) throw new Error("no /(.*) header rule in vercel.json");
  return rule.headers as Array<{ key: string; value: string }>;
}

describe("content vercel.json headers", () => {
  it("applies to every path", () => {
    expect(vercel.headers.some((h: { source: string }) => h.source === "/(.*)")).toBe(true);
  });

  it("CSP is exactly buildContentCsp(APP_ORIGIN) — no drift from policy", () => {
    const csp = headerRule().find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toBe(buildContentCsp(APP_ORIGIN));
  });

  it("sets X-Content-Type-Options: nosniff", () => {
    const nosniff = headerRule().find((h) => h.key === "X-Content-Type-Options");
    expect(nosniff?.value).toBe("nosniff");
  });

  it("the committed file equals what the generator would write right now", () => {
    const expected = JSON.stringify(buildVercelConfig(APP_ORIGIN), null, 2) + "\n";
    const actual = readFileSync(join(here, "vercel.json"), "utf8");
    expect(actual).toBe(expected);
  });
});
