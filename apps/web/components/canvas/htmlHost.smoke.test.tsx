import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FRAME_SANDBOX_ATTR } from "@hermes/policy";
import { ArtifactPane } from "./ArtifactPane";
import { HtmlArtifactHost } from "./HtmlArtifactHost";
import { HtmlPreviewActivate } from "./HtmlPreviewActivate";

/**
 * WP5 render smokes (`renderToStaticMarkup`, matching the history/chat suites).
 * Prove: the mounted frame carries EXACTLY the policy sandbox attribute and the
 * content origin; the flag-off artifact pane shows the honest disabled state
 * (never a blank); history previews are click-to-activate.
 */

const VERSION = {
  artifactId: "art_7",
  seq: 2,
  content: "<h1>hello</h1>",
  author: "agent" as const,
  contended: false,
  renderState: "ok" as const,
};

describe("HtmlArtifactHost markup", () => {
  it("renders the sandbox iframe with the exact policy sandbox attr and origin", () => {
    const html = renderToStaticMarkup(
      h(HtmlArtifactHost, {
        html: "<h1>x</h1>",
        artifactId: "art_7",
        seq: 2,
        contentOrigin: "https://content.example",
      }),
    );
    expect(html).toContain(`sandbox="${FRAME_SANDBOX_ATTR}"`);
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain('src="https://content.example/"');
    expect(html.toLowerCase()).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain("Loading sandboxed preview…");
  });
});

describe("ArtifactPane html-static flag gating", () => {
  it("shows the honest disabled state when html_artifacts is off (default)", () => {
    const html = renderToStaticMarkup(
      h(ArtifactPane, {
        artifact: {
          id: "art_7",
          type: "html-static" as const,
          title: "Widget",
          status: "active" as const,
          headSeq: 2,
          changed: false,
        },
        content: { status: "ready" as const, version: VERSION },
      }),
    );
    expect(html).toContain("HTML artifacts are disabled");
    expect(html).toContain("html_artifacts");
    expect(html).not.toContain("<iframe");
  });
});

describe("HtmlPreviewActivate", () => {
  it("shows an explicit activate affordance instead of auto-mounting an iframe", () => {
    const html = renderToStaticMarkup(
      h(HtmlPreviewActivate, { html: "<p>a</p>", renderError: false, side: "before" }),
    );
    expect(html).toContain("Activate before preview");
    expect(html).not.toContain("<iframe");
  });

  it("shows the render-error notice for a failed version", () => {
    const html = renderToStaticMarkup(
      h(HtmlPreviewActivate, { html: "<p>a</p>", renderError: true, side: "after" }),
    );
    expect(html).toContain("failed to render");
    expect(html).not.toContain("Activate");
  });
});
