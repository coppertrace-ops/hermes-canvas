#!/usr/bin/env node
/**
 * Header assertion script (OWNER: WARDEN, spec §2.7 item 2; G5/WP3/WP4).
 *
 * Asserts the exact security headers on the content origin and the app origin.
 * Three modes:
 *
 *   --local            Build must exist at apps/content/out. Serves it with the
 *                      committed vercel.json header rules applied to EVERY path
 *                      and asserts the content CSP + nosniff on `/` and an
 *                      arbitrary path. Runs with no deploy (pre-F1).
 *   --url  <origin>    Fetches the DEPLOYED content origin and asserts the same.
 *   --app  <origin>    Fetches the app origin and asserts the app-origin CSP
 *                      (frame-src content host, connect-src Convex, img-src closes
 *                      the beacon channel, object-src none, frame-ancestors none).
 *
 * The EXPECTED content CSP is read from apps/content/vercel.json — the committed,
 * @hermes/policy-generated source of truth (kept in sync by
 * apps/content/headers.test.ts). This script is node-only (no TS import) yet
 * transitively asserts the policy value.
 *
 * Exit 0 iff every assertion passes; otherwise prints each failure and exits 1.
 * Any token/Authorization header is never printed (we only read security headers).
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CONTENT_VERCEL = join(REPO, "apps", "content", "vercel.json");
const CONTENT_OUT = join(REPO, "apps", "content", "out");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const failures = [];
const passes = [];
function assert(cond, label, detail) {
  if (cond) passes.push(label);
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

/** The committed content header rule (policy-generated). */
function contentHeaderRule() {
  const cfg = JSON.parse(readFileSync(CONTENT_VERCEL, "utf8"));
  const rule = (cfg.headers ?? []).find((h) => h.source === "/(.*)");
  if (!rule) throw new Error("no /(.*) header rule in apps/content/vercel.json");
  const map = {};
  for (const h of rule.headers) map[h.key.toLowerCase()] = h.value;
  return map;
}

/** Serve apps/content/out, applying `headers` to EVERY response (200 or 404). */
function serveContent(headers) {
  return createServer((req, res) => {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const candidate = normalize(join(CONTENT_OUT, urlPath));
    if (!candidate.startsWith(CONTENT_OUT)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME[extname(candidate)] ?? "application/octet-stream");
      createReadStream(candidate).pipe(res);
    } else {
      // Header rules with source /(.*) apply even to a miss — mirror that.
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<!doctype html><title>404</title>not found");
    }
  });
}

function checkContentHeaders(where, actualCsp, actualNosniff, expected) {
  assert(
    actualCsp === expected["content-security-policy"],
    `[content ${where}] CSP is exactly the policy value`,
    actualCsp ? `got: ${actualCsp}` : "no CSP header",
  );
  assert(
    actualNosniff === "nosniff",
    `[content ${where}] X-Content-Type-Options: nosniff`,
    actualNosniff ? `got: ${actualNosniff}` : "missing",
  );
  // Belt-and-suspenders: the egress-kill directives are present.
  const csp = actualCsp ?? "";
  for (const directive of ["default-src 'none'", "connect-src 'none'", "img-src data: blob:", "form-action 'none'", "base-uri 'none'"]) {
    assert(csp.includes(directive), `[content ${where}] CSP contains "${directive}"`);
  }
  assert(!/https?:\/\/(cdnjs|unpkg|jsdelivr)/.test(csp), `[content ${where}] no CDN allowlist in CSP`);
}

async function runLocal() {
  if (!existsSync(CONTENT_OUT)) {
    console.error(`✖ ${CONTENT_OUT} missing — build first: pnpm --filter @hermes/content build`);
    process.exit(1);
  }
  const expected = contentHeaderRule();
  const server = serveContent(expected);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const path of ["/", "/an/arbitrary/deep/path"]) {
      const res = await fetch(base + path);
      checkContentHeaders(`local ${path}`, res.headers.get("content-security-policy"), res.headers.get("x-content-type-options"), expected);
    }
  } finally {
    server.close();
  }
}

async function runUrl(origin) {
  const expected = contentHeaderRule();
  const clean = origin.replace(/\/+$/, "");
  for (const path of ["/", "/an/arbitrary/deep/path"]) {
    const res = await fetch(clean + path);
    checkContentHeaders(`url ${path}`, res.headers.get("content-security-policy"), res.headers.get("x-content-type-options"), expected);
  }
}

async function runApp(origin) {
  const clean = origin.replace(/\/+$/, "");
  const res = await fetch(clean + "/");
  const csp = res.headers.get("content-security-policy");
  assert(!!csp, "[app] Content-Security-Policy header present", "no CSP header on app origin");
  const c = csp ?? "";
  // Required app-hardening directives (spec §2.3). Exact-string match lands in WP4
  // via the app's generated expected file; here we assert the security-critical
  // directives are present so the app CSP can't silently regress.
  for (const directive of ["frame-src ", "connect-src 'self'", "img-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
    assert(c.includes(directive), `[app] CSP contains "${directive}"`);
  }
  assert(!/img-src[^;]*\*/.test(c), "[app] img-src has no wildcard (beacon channel closed)");
  assert(res.headers.get("x-content-type-options") === "nosniff", "[app] X-Content-Type-Options: nosniff");
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  try {
    if (mode === "--local") await runLocal();
    else if (mode === "--url") await runUrl(requireArg(args, "--url"));
    else if (mode === "--app") await runApp(requireArg(args, "--app"));
    else {
      console.error("usage: assert-headers.mjs (--local | --url <content-origin> | --app <app-origin>)");
      process.exit(2);
    }
  } catch (err) {
    console.error(`✖ assert-headers crashed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  for (const p of passes) console.log(`  ✓ ${p}`);
  if (failures.length > 0) {
    console.error(`\n✖ HEADER ASSERTIONS FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n✅ HEADER ASSERTIONS PASSED — ${passes.length} checks (${mode})`);
}

function requireArg(args, flag) {
  const i = args.indexOf(flag);
  const val = args[i + 1];
  if (!val) {
    console.error(`✖ ${flag} requires an origin argument`);
    process.exit(2);
  }
  return val;
}

main();
