import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistoryPanel, useMockHistoryAdapter } from "../history";
import { IntegrationApp } from "./IntegrationApp";

/**
 * Integration render smoke (OWNER: PROOF). Proves the assembled Wave 1 workspace
 * renders all three subsystems together without throwing and that the integration
 * chrome (brand, demo banner, view switch, theme toggle, resizable divider) is
 * present. Uses `renderToStaticMarkup` — the repo convention (chat/history smokes)
 * — so it needs only react-dom. Live interaction (theme toggle, tab switch,
 * resize, view switch) is exercised in the browser smoke (e2e/).
 */

const app = renderToStaticMarkup(h(IntegrationApp));

// A tiny harness mirroring how IntegrationApp wires history, to prove that path
// renders (the History view is behind an in-app switch this static render can't
// toggle).
function HistoryHarness() {
  const history = useMockHistoryAdapter();
  return h(HistoryPanel, { adapter: history.adapter });
}
const historyMarkup = renderToStaticMarkup(h(HistoryHarness));

describe("IntegrationApp render smoke", () => {
  it("renders the brand and the honest demo-data banner", () => {
    expect(app).toContain("Hermes Canvas");
    expect(app).toContain("Demo data");
  });

  it("mounts the chat surface (COURIER): transcript region + composer", () => {
    // The seeded transcript hydrates via an effect (COURIER's live-query seam),
    // so the static render shows the chat *chrome*; the live transcript is
    // asserted in the browser smoke.
    expect(app).toContain('aria-label="Conversation"');
    expect(app).toContain("Message Hermes");
  });

  it("renders the canvas with tabs and the markdown artifact (PANES surface)", () => {
    // Tabs
    expect(app).toContain("Design");
    expect(app).toContain("Operations");
    // Markdown artifact content
    expect(app).toContain("Design notes");
    expect(app).toContain("Principles");
  });

  it("blocks external images with a visible placeholder showing the URL", () => {
    // plan §4: agent markdown external images must not load; the URL becomes
    // audit evidence rather than a silent beacon.
    expect(app).toContain("https://example.com/tracker.png");
    expect(app).not.toContain('src="https://example.com/tracker.png"');
  });

  it("exposes the Canvas/History view switch", () => {
    expect(app).toContain(">Canvas<");
    expect(app).toContain(">History<");
  });

  it("mounts the theme toggle (dark/light/system)", () => {
    expect(app).toContain("Theme:");
  });

  it("mounts the resizable split divider", () => {
    expect(app).toContain('role="separator"');
    expect(app).toContain('aria-valuenow');
  });

  it("renders the composer with the attachment affordance", () => {
    // COURIER composer exposes an attach control + text input.
    expect(app.toLowerCase()).toContain("attach");
  });

  it("renders the history timeline surface (CHRONICLE) as wired by the app", () => {
    // The scripted 20-write session renders its version timeline + diff.
    expect(historyMarkup).toContain("hc-version-timeline");
    expect(historyMarkup).toContain("Design notes");
  });
});
