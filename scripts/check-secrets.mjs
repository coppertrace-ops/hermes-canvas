#!/usr/bin/env node
// check-secrets.mjs — cheap pre-commit / CI guard against committed secrets.
//
// Scans git-tracked files for (a) real dotenv files that should never be tracked
// and (b) high-signal secret patterns. It NEVER prints a matched secret value —
// only the file and a redacted marker. Exit 1 on any finding.
//
// ATLAS-owned. Intentionally dependency-free (plain Node, run via `node`).

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REDACTED = "«redacted»";

// Files that must never be tracked (real env / key material). `.env.example` is allowed.
const FORBIDDEN_PATHS = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /(^|\/)\.convex\.env$/,
  /\.pem$/,
  /\.key$/,
  /(^|\/)convex\.json$/,
];

// High-signal secret content patterns. Kept conservative to avoid noise.
const SECRET_PATTERNS = [
  { name: "private key block", re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Convex deploy key", re: /\b(prod|dev):[a-z0-9-]+\|[A-Za-z0-9]{20,}/ },
  { name: "GitHub token", re: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: "generic bearer secret assignment", re: /(SERVICE_TOKEN|SECRET|PRIVATE_KEY)\s*[:=]\s*["']?[A-Za-z0-9+/_-]{32,}/ },
];

function trackedFiles() {
  const out = execSync("git ls-files -z", { encoding: "buffer" });
  return out
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

const findings = [];

let files;
try {
  files = trackedFiles();
} catch {
  console.error("check-secrets: not a git repo or git unavailable; skipping.");
  process.exit(0);
}

for (const file of files) {
  for (const re of FORBIDDEN_PATHS) {
    if (re.test(file)) {
      findings.push(`forbidden tracked file: ${file}`);
    }
  }

  // Only content-scan reasonably-sized text files.
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue; // binary or unreadable
  }
  if (content.length > 2_000_000) continue;

  // The example template is allowed to contain placeholder-shaped strings.
  if (/(^|\/)\.env\.example$/.test(file)) continue;
  if (/(^|\/)scripts\/check-secrets\.mjs$/.test(file)) continue; // this file defines the patterns

  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(content)) {
      findings.push(`possible ${name} in ${file} (${REDACTED})`);
    }
  }
}

if (findings.length > 0) {
  console.error("check-secrets: FAILED — potential secrets detected:");
  for (const f of findings) console.error("  - " + f);
  process.exit(1);
}

console.log("check-secrets: OK — no tracked secrets detected.");
