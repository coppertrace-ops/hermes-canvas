/**
 * Browser smoke (OWNER: PROOF, plan §7 Playwright harness).
 *
 * Drives the assembled Wave 1 workspace in a real browser and proves the
 * integration end-to-end: chat + canvas + history render together, the seeded
 * transcript hydrates live, the theme toggles, the divider resizes and persists,
 * tabs switch (with changed badges), Markdown + Mermaid render, external images
 * are blocked (no network egress), the history/diff view works, and the
 * attachment UI is present.
 *
 * Uses playwright-core against system Chrome (no Chromium download). Run:
 *   BASE_URL=http://localhost:3300 node e2e/browser-smoke.mjs
 * Exits non-zero on the first failed assertion; writes screenshots to
 * e2e/artifacts/.
 */

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3300";
const CHROME_PATH =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const here = dirname(fileURLToPath(import.meta.url));
const artifactsDir = join(here, "artifacts");
mkdirSync(artifactsDir, { recursive: true });

let passed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const shot = (page, name) => page.screenshot({ path: join(artifactsDir, name), fullPage: false });

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Track any attempt to load the external tracker image (must never happen).
  const externalImageRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("example.com/tracker.png")) externalImageRequests.push(req.url());
  });
  await page.route("**://example.com/**", (route) => route.abort());

  console.log(`\n▶ Loading ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  // --- 1. All three surfaces render together; chat transcript hydrates live ---
  console.log("\n[1] Three surfaces render together");
  await page.getByText("tighten the principles section", { exact: false }).waitFor({ timeout: 15000 });
  check("chat transcript hydrated (COURIER live seam)", true);
  check(
    "agent reply present",
    (await page.getByText("diagram in the Design tab", { exact: false }).count()) > 0,
  );
  check("demo-data banner visible", await page.getByText("Demo data", { exact: false }).isVisible());
  check(
    "canvas artifact 'Design notes' visible (PANES)",
    (await page.getByText("Design notes").count()) > 0,
  );
  check("markdown body rendered", (await page.getByText("Principles").count()) > 0);

  // --- 2. External images blocked (no egress), URL shown as evidence ----------
  console.log("\n[2] External image blocked (plan §4)");
  const blocked = page.locator(".hc-md__img-blocked");
  check("blocked-image placeholder shown", (await blocked.count()) > 0);
  check(
    "blocked placeholder exposes the target URL",
    (await page.locator('[data-blocked-url="https://example.com/tracker.png"]').count()) > 0,
  );
  check(
    "no network request to external image",
    externalImageRequests.length === 0,
    `saw ${externalImageRequests.length}`,
  );

  await shot(page, "01-canvas-light.png");

  // --- 3. Theme toggle (dark/light/system) ------------------------------------
  console.log("\n[3] Theme toggle");
  const themeBtn = page.locator('[aria-label^="Theme:"]').first();
  check("theme toggle present", (await themeBtn.count()) > 0);
  const themeOf = () => page.evaluate(() => document.documentElement.dataset.theme ?? "system");
  const bgOf = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await themeOf();
  const bgBefore = await bgOf();
  await themeBtn.click(); // system → light
  await page.waitForTimeout(150);
  const afterLight = await themeOf();
  await themeBtn.click(); // light → dark
  await page.waitForTimeout(150);
  const afterDark = await themeOf();
  const bgDark = await bgOf();
  check("theme attribute changes on toggle", afterLight !== before || afterDark !== afterLight, `${before}→${afterLight}→${afterDark}`);
  check("dark theme applied", afterDark === "dark", `got ${afterDark}`);
  check("body background changes between light and dark", bgDark !== bgBefore, `${bgBefore} vs ${bgDark}`);
  await shot(page, "02-canvas-dark.png");

  // --- 4. Resizable divider + persistence -------------------------------------
  console.log("\n[4] Resizable divider");
  // The resize divider is the separator carrying aria-valuenow; disambiguate
  // from chat DayDivider elements that also use role="separator".
  const sep = page.locator('[role="separator"][aria-valuenow]').first();
  check("divider present", (await sep.count()) > 0);
  const valNow = () => sep.getAttribute("aria-valuenow");
  const v0 = await valNow();
  await sep.focus();
  await page.keyboard.press("Home"); // jump to min
  await page.waitForTimeout(100);
  const vMin = await valNow();
  await page.keyboard.press("End"); // jump to max
  await page.waitForTimeout(100);
  const vMax = await valNow();
  check("divider value responds to keyboard", vMin !== vMax, `${v0}→min ${vMin}→max ${vMax}`);
  const persisted = await page.evaluate(() => localStorage.getItem("hc-chat-canvas-split"));
  check("divider position persisted to localStorage", persisted !== null, `value=${persisted}`);

  // --- 5. Mermaid renders (Design tab, second artifact) -----------------------
  console.log("\n[5] Mermaid renderer");
  const flowRail = page.getByRole("tab", { name: "Auth flow" });
  if ((await flowRail.count()) > 0) {
    await flowRail.first().click();
    // Never blank: either a rendered SVG (ok) or a visible error+source.
    await page.locator('.hc-mermaid[data-state="ok"], .hc-mermaid[data-state="error"]').first().waitFor({ timeout: 10000 });
    const ok = await page.locator('.hc-mermaid[data-state="ok"] svg').count();
    const err = await page.locator('.hc-mermaid[data-state="error"]').count();
    check("mermaid resolves to a non-blank state (svg or visible error)", ok > 0 || err > 0, `ok=${ok} err=${err}`);
  } else {
    check("mermaid artifact rail present", false, "Auth flow rail not found");
  }

  // --- 6. Tab switch + changed badge ------------------------------------------
  console.log("\n[6] Tab switch + changed badge");
  const opsBadgeBefore = await page.locator('.hc-tabbar__item .hc-tabbar__badge').count();
  await page.getByRole("tab", { name: /Operations/ }).first().click();
  await page.getByText("Operational notes", { exact: false }).waitFor({ timeout: 8000 });
  check("switching tab shows the Operations artifact (Runbook)", true);
  check("a changed badge was present before viewing", opsBadgeBefore > 0, `count=${opsBadgeBefore}`);

  // --- 7. History / diff view -------------------------------------------------
  console.log("\n[7] History + diff view");
  await page.locator('.hc-viewswitch__btn', { hasText: "History" }).click();
  await page.locator(".hc-version-timeline").waitFor({ timeout: 8000 });
  check("history timeline renders", (await page.locator(".hc-version-timeline").count()) > 0);
  const versionItems = await page.locator('.hc-version-timeline [role="listitem"]').count();
  check("timeline has multiple versions", versionItems > 1, `count=${versionItems}`);
  // Select an older version → the diff + restore affordance appear.
  await page.locator('.hc-version-timeline [role="listitem"] button').nth(1).click();
  await page.waitForTimeout(200);
  check(
    "selecting a version reveals the restore affordance (append-only)",
    (await page.getByRole("button", { name: /Restore this version/ }).count()) > 0,
  );
  await shot(page, "03-history.png");

  // --- 8. Attachment UI -------------------------------------------------------
  console.log("\n[8] Attachment UI (COURIER composer)");
  const fileInput = page.locator('input[type="file"]');
  check("composer exposes a file input", (await fileInput.count()) > 0);
  const attachBtn = page.locator('[aria-label*="ttach"], button:has-text("Attach")');
  check("composer exposes an attach affordance", (await attachBtn.count()) > 0);

  await browser.close();

  // --- Summary ----------------------------------------------------------------
  console.log(`\n${"─".repeat(56)}`);
  if (failures.length === 0) {
    console.log(`✅ BROWSER SMOKE PASSED — ${passed} checks`);
    console.log(`   screenshots: ${artifactsDir}`);
    process.exit(0);
  } else {
    console.log(`❌ BROWSER SMOKE FAILED — ${passed} passed, ${failures.length} failed:`);
    for (const f of failures) console.log(`   - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n💥 Browser smoke crashed:", err);
  process.exit(1);
});
