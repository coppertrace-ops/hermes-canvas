#!/usr/bin/env node
// provision-service-token.mjs — mint the Hermes `/agent/*` service token.
//
// OWNER: LEDGER (plan §2.1). Generates a 256-bit random bearer token, prints its
// SHA-256 (safe to paste anywhere — this is what the Convex deployment stores),
// and reveals the raw token EXACTLY ONCE, only to the invoking TTY. The plaintext
// token is never written to a pipe, a file, or a log — so a `> token.txt` or a CI
// capture gets the hash and instructions, never the secret.
//
// Convex verifies `HERMES_SERVICE_TOKEN_SHA256` (preferred) or hashes a raw
// `HERMES_SERVICE_TOKEN` at request time (see convex/lib/agentAuth.ts). This
// script wires the preferred, hash-only path so the plaintext never lives in the
// deployment env.
//
// Dependency-free plain Node, run via `node` (matches scripts/check-secrets.mjs).

import { createHash, randomBytes } from "node:crypto";
import { closeSync, openSync, writeSync } from "node:fs";

/** SHA-256 of a UTF-8 string, hex (matches the server's constant-time compare). */
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Reveal the raw token to the controlling terminal only. Returns true on success.
 * Prefers /dev/tty (the real terminal even when stdout is redirected); falls back
 * to stdout ONLY when stdout itself is a TTY. Never touches a redirected stdout.
 */
function revealToTty(token) {
  const banner =
    "\n" +
    "  ┌─ Hermes service token (shown ONCE — copy it now) ────────────────\n" +
    "  │\n" +
    `  │   HERMES_SERVICE_TOKEN=${token}\n` +
    "  │\n" +
    "  │   Put this in the Hermes host runtime env. It is NOT recoverable;\n" +
    "  │   re-run this script to rotate (then update both sides).\n" +
    "  └──────────────────────────────────────────────────────────────────\n";
  try {
    const fd = openSync("/dev/tty", "w");
    try {
      writeSync(fd, banner);
      return true;
    } finally {
      closeSync(fd);
    }
  } catch {
    // No /dev/tty (e.g. Windows or a detached process). Fall back to stdout only
    // if it is an interactive terminal, never a redirect.
    if (process.stdout.isTTY) {
      process.stdout.write(banner);
      return true;
    }
    return false;
  }
}

function main() {
  // 32 bytes = 256 bits of CSPRNG entropy, URL-safe base64 for a clean bearer.
  const token = randomBytes(32).toString("base64url");
  const hash = sha256Hex(token);

  // Everything below is non-secret and safe for stdout / pipes / CI logs.
  const out = process.stdout;
  out.write("Hermes Canvas — service token provisioning\n");
  out.write("==========================================\n\n");
  out.write("1) Store the HASH in the Convex deployment (plaintext never leaves this TTY):\n\n");
  out.write(`     npx convex env set HERMES_SERVICE_TOKEN_SHA256 ${hash}\n\n`);
  out.write("   SHA-256 (safe to share):\n");
  out.write(`     ${hash}\n\n`);
  out.write("2) Copy the raw token from the terminal banner below into the Hermes host env\n");
  out.write("   as HERMES_SERVICE_TOKEN (see docs/hermes-host-integration.md).\n");

  const shown = revealToTty(token);
  if (!shown) {
    process.stderr.write(
      "\n[provision] Refusing to print the raw token: no interactive terminal detected.\n" +
        "[provision] Re-run this in an interactive shell (not piped/redirected) to reveal it.\n" +
        "[provision] The SHA-256 above is already safe to use for the Convex env.\n",
    );
    process.exitCode = 2;
    return;
  }
  out.write("\nDone. The raw token was shown once, above. It is not stored anywhere.\n");
}

main();
