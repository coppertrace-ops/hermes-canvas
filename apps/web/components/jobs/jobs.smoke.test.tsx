import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JobsView } from "./JobsView";
import type { JobView } from "./overdue";

/** Jobs view render smokes (`renderToStaticMarkup`). Fixed `now` — no Date.now. */

const NOW = new Date(2026, 6, 14, 12, 0, 0).getTime();
const HOUR = 3_600_000;

function jobs(): JobView[] {
  return [
    {
      key: "backup",
      name: "Nightly backup",
      scheduleCron: "0 * * * *",
      description: "Snapshot export",
      source: "hermes-box",
      status: "active",
      updatedAt: NOW - 6 * HOUR,
      runs: [{ runId: "r1", status: "succeeded", startedAt: NOW - 6 * HOUR, finishedAt: NOW - 6 * HOUR + 5000, summary: "ok", logTail: "done." }],
    },
  ];
}

describe("JobsView markup", () => {
  it("renders the health card + a job row with schedule, and flags overdue", () => {
    const html = renderToStaticMarkup(h(JobsView, { jobs: jobs(), now: NOW }));
    expect(html).toContain("Scheduler health");
    expect(html).toContain("Nightly backup");
    expect(html).toContain("At :00 every hour"); // describeCron
    expect(html).toContain("missed / not reporting"); // 6h stale hourly → overdue
    expect(html).toContain("Run history");
    expect(html).toContain("done."); // log tail rendered
  });

  it("renders the honest empty + loading states", () => {
    expect(renderToStaticMarkup(h(JobsView, { jobs: [], now: NOW }))).toContain("No scheduled jobs registered yet");
    expect(renderToStaticMarkup(h(JobsView, { jobs: undefined }))).toContain("Loading scheduled jobs");
  });

  it("a fresh, on-schedule job reads healthy", () => {
    const healthy: JobView[] = [{ ...jobs()[0]!, runs: [{ runId: "r", status: "succeeded", startedAt: NOW - 10 * 60_000 }] }];
    const html = renderToStaticMarkup(h(JobsView, { jobs: healthy, now: NOW }));
    expect(html).toContain("on schedule");
    expect(html).not.toContain("missed / not reporting");
  });
});
