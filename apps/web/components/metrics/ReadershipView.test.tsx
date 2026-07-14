import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReadershipSummary } from "@hermes/diff";
import { ReadershipView, formatDuration, isEmptyReadership } from "./ReadershipView";

/**
 * ReadershipView rendering + pure helpers (OWNER: PROOF). Uses `renderToStaticMarkup`
 * — the repo convention for component smokes — so it needs only react-dom. The core
 * value is the honest empty state (no data ≠ a wall of zeros) and that real numbers
 * surface once telemetry exists.
 */

const EMPTY: ReadershipSummary = {
  diffOpens: 0,
  badgeClicks: 0,
  restores: 0,
  firstViews: 0,
  mergePromptsOpened: 0,
  mergesResolved: 0,
  medianTimeToFirstViewMs: null,
  artifactsWithDiffOpened: 0,
  artifactsViewed: 0,
};

const POPULATED: ReadershipSummary = {
  diffOpens: 12,
  badgeClicks: 34,
  restores: 2,
  firstViews: 8,
  mergePromptsOpened: 3,
  mergesResolved: 1,
  medianTimeToFirstViewMs: 2500,
  artifactsWithDiffOpened: 4,
  artifactsViewed: 5,
};

describe("ReadershipView", () => {
  it("shows a loading frame while the summary is undefined", () => {
    const html = renderToStaticMarkup(h(ReadershipView, { summary: undefined }));
    expect(html).toContain("Loading readership");
  });

  it("shows an honest empty state when there is no engagement", () => {
    const html = renderToStaticMarkup(h(ReadershipView, { summary: EMPTY }));
    expect(html).toContain("No readership data yet");
    // Must NOT dress a wall of zeros up as insight.
    expect(html).not.toContain("Diff opens");
  });

  it("renders the numbers once telemetry exists", () => {
    const html = renderToStaticMarkup(h(ReadershipView, { summary: POPULATED }));
    expect(html).toContain("Diff opens");
    expect(html).toContain("Badge clicks");
    expect(html).toContain("12");
    expect(html).toContain("34");
    expect(html).toContain("2.5 s"); // median time-to-first-view
    expect(html).toContain("4 artifacts"); // distinct artifacts with a diff opened
  });
});

describe("isEmptyReadership", () => {
  it("is true only when every engagement count is zero", () => {
    expect(isEmptyReadership(EMPTY)).toBe(true);
    expect(isEmptyReadership(POPULATED)).toBe(false);
    expect(isEmptyReadership({ ...EMPTY, badgeClicks: 1 })).toBe(false);
  });
});

describe("formatDuration", () => {
  it("renders an em dash for null", () => {
    expect(formatDuration(null)).toBe("—");
  });
  it("renders sub-second values in ms", () => {
    expect(formatDuration(500)).toBe("500 ms");
  });
  it("renders seconds with one decimal below ten", () => {
    expect(formatDuration(2500)).toBe("2.5 s");
  });
  it("renders minutes and seconds past a minute", () => {
    expect(formatDuration(65000)).toBe("1m 5s");
  });
});
