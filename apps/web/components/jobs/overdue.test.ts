import { LIMITS } from "@hermes/policy";
import { describe, expect, it } from "vitest";
import { evaluateJob, graceForInterval, latestRun, summarizeJobs } from "./overdue";
import type { JobView } from "./overdue";

/** Overdue-detection specs (WP8 / G6) — the silent-dead-scheduler tripwire. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = new Date(2026, 6, 14, 12, 0, 0).getTime();

function job(over: Partial<JobView> = {}): JobView {
  return {
    key: "backup",
    name: "Nightly backup",
    scheduleCron: "0 * * * *", // hourly
    description: "",
    source: "hermes-box",
    status: "active",
    updatedAt: NOW - 6 * HOUR,
    runs: [],
    ...over,
  };
}

function run(startedAt: number, status: "started" | "succeeded" | "failed" = "succeeded") {
  return { runId: `r-${startedAt}`, status, startedAt };
}

describe("graceForInterval", () => {
  it("uses the fraction for long intervals, the floor for short", () => {
    expect(graceForInterval(8 * HOUR)).toBe(Math.round(LIMITS.JOBS_GRACE_FRACTION * 8 * HOUR));
    expect(graceForInterval(5 * MIN)).toBe(LIMITS.JOBS_GRACE_MIN_MS);
    expect(graceForInterval(null)).toBe(LIMITS.JOBS_GRACE_MIN_MS);
  });
});

describe("latestRun", () => {
  it("returns the newest by start time regardless of array order", () => {
    const runs = [run(NOW - 3 * HOUR), run(NOW - HOUR), run(NOW - 2 * HOUR)];
    expect(latestRun(runs)?.startedAt).toBe(NOW - HOUR);
    expect(latestRun([])).toBeNull();
  });
});

describe("evaluateJob", () => {
  it("healthy when the last run is recent relative to schedule", () => {
    const h = evaluateJob(job({ runs: [run(NOW - 10 * MIN)] }), NOW);
    expect(h.health).toBe("ok");
    expect(h.nextExpectedRun).not.toBeNull();
  });

  it("OVERDUE when the schedule fired long ago with no report (dead scheduler)", () => {
    // hourly cron, last run 6h ago → next expected ~5h ago, well past grace.
    const h = evaluateJob(job({ runs: [run(NOW - 6 * HOUR)] }), NOW);
    expect(h.health).toBe("overdue");
    expect(h.lastRun?.startedAt).toBe(NOW - 6 * HOUR);
  });

  it("never-run stays quiet until the first expected run + grace passes", () => {
    // Registered 2 minutes ago, hourly → first run not due yet.
    const fresh = evaluateJob(job({ updatedAt: NOW - 2 * MIN, runs: [] }), NOW);
    expect(fresh.health).toBe("never-run");
    // Registered 3h ago, hourly, never ran → overdue.
    const stale = evaluateJob(job({ updatedAt: NOW - 3 * HOUR, runs: [] }), NOW);
    expect(stale.health).toBe("overdue");
  });

  it("paused jobs never report overdue", () => {
    const h = evaluateJob(job({ status: "paused", updatedAt: NOW - 10 * HOUR, runs: [] }), NOW);
    expect(h.health).toBe("paused");
  });

  it("unparsable schedule is surfaced, not hidden", () => {
    const h = evaluateJob(job({ scheduleCron: "not a cron" }), NOW);
    expect(h.health).toBe("unparsable");
  });
});

describe("summarizeJobs", () => {
  it("aggregates overdue / failing / runs for the metrics card", () => {
    const jobs: JobView[] = [
      job({ key: "a", runs: [run(NOW - 10 * MIN)] }), // ok
      job({ key: "b", runs: [run(NOW - 6 * HOUR)] }), // overdue
      job({ key: "c", runs: [run(NOW - 10 * MIN, "failed")] }), // failing
      job({ key: "d", status: "paused", runs: [] }), // paused
    ];
    const s = summarizeJobs(jobs, NOW);
    expect(s.total).toBe(4);
    expect(s.overdue).toBe(1);
    expect(s.failing).toBe(1);
    expect(s.paused).toBe(1);
    expect(s.runsReported).toBe(3);
  });
});
