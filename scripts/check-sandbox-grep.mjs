#!/usr/bin/env node
// check-sandbox-grep.mjs — CI grep-guard for the sandbox floor (Gate G5, plan §4).
//
// The one sandbox token that would break the whole HTML-artifact security model
// is `allow-same-origin`: combined with `allow-scripts` (which the frame needs to
// compute), a frame granted same-origin can reach through and strip its own
// sandbox. It must appear NOWHERE that could reach an iframe `sandbox` attribute.
//
// This asserts the literal forbidden tokens never appear in app/package SOURCE
// except in explicitly-allowlisted defensive contexts (the policy that names them
// to forbid them, and tests that assert their absence). A new occurrence fails CI
// — a relaxation must be a deliberate, reviewed change to the allowlist here AND a
// threat-model amendment (F7), never an accidental attribute edit.
//
// WARDEN-owned. Dependency-free (plain Node). Exit 1 on any un-allowlisted hit.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Tokens that must never reach an iframe sandbox attribute. */
const FORBIDDEN = [
  "allow-same-origin",
  "allow-popups",
  "allow-top-navigation",
  "allow-forms",
  "allow-downloads",
  "allow-modals",
  "allow-popups-to-escape-sandbox",
];

/** Only scan real source we author. */
const SCAN_RE = /^(apps|packages|e2e|scripts)\/.*\.(ts|tsx|js|mjs|cjs|jsx)$/;

/**
 * Lines are allowlisted when they are DEFENSIVE mentions, not live grants:
 *   - the policy module that enumerates forbidden tokens to forbid them,
 *   - any line carrying an explicit `sandbox-grep-allow` pragma,
 *   - test / doc-comment mentions asserting the token's ABSENCE.
 * The allowlist is deliberately narrow: it keys on file OR an inline pragma, so a
 * new live `sandbox="allow-same-origin"` anywhere still fails.
 */
const ALLOWLIST_FILES = new Set([
  "packages/policy/src/sandbox.ts", // enumerates FORBIDDEN_SANDBOX_TOKENS
  "packages/policy/src/csp.ts", // doc comment explains why same-origin is absent
  "scripts/check-sandbox-grep.mjs", // this file
]);

function isAllowlisted(file, line) {
  if (ALLOWLIST_FILES.has(file)) return true;
  if (line.includes("sandbox-grep-allow")) return true;
  // Test assertions of ABSENCE: a line that checks the token is NOT present.
  if (/\.test\.(ts|tsx|js|mjs)$/.test(file) && /not\.toContain|toContain\(|FORBIDDEN|forbidden|expect\(/.test(line)) {
    return true;
  }
  return false;
}

function trackedFiles() {
  return execSync("git ls-files -z", { encoding: "buffer" })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((f) => SCAN_RE.test(f));
}

const findings = [];
for (const file of trackedFiles()) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const token of FORBIDDEN) {
      if (line.includes(token) && !isAllowlisted(file, line)) {
        findings.push(`${file}:${i + 1}  contains forbidden sandbox token "${token}"`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`✖ check-sandbox-grep: ${findings.length} forbidden sandbox token(s) found:`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error(
    "\nA sandbox relaxation requires a threat-model amendment (F7) and an explicit\n" +
      "allowlist entry / `sandbox-grep-allow` pragma here — never an accidental edit.",
  );
  process.exit(1);
}

console.log("check-sandbox-grep: OK — no forbidden sandbox tokens in source.");
