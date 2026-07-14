/**
 * Overdue detection (PANES; Wave 2 P6 jobs tab, plan §5). Pure + DOM-free.
 *
 * "A dead scheduler that looks healthy is exactly the silent-failure class this
 * product exists to expose." A job is overdue once `now > nextExpectedRun + grace`
 * with no run reported since. `nextExpectedRun` is computed from the LAST reported
 * run's start (or the job's registration time if it never ran) via the cron
 * schedule; `grace` uses the WARDEN policy constants, proportional to the interval
 * with a 10-minute floor so a fast cron gets a small grace and a slow one a floor.
 */

import { LIMITS } from "@hermes/policy";
import { estimateIntervalMs, nextRun, parseCron } from "./cron";

export type JobHealth = "ok" | "overdue" | "never-run" | "unparsable" | "paused";

export interface JobRunView {
  runId: string;
  status: "started" | "succeeded" | "failed";
  startedAt: number;
  finishedAt?: number;
  summary?: string;
  logTail?: string;
}

export interface JobView {
  key: string;
  name: string;
  scheduleCron: string;
  description: string;
  source: string;
  status: "active" | "paused";
  updatedAt: number;
  runs: JobRunView[];
}

export interface JobHealthResult {
  health: JobHealth;
  /** Computed next expected run (epoch ms), or null if unparsable/paused. */
  nextExpectedRun: number | null;
  /** The most recent run, if any. */
  lastRun: JobRunView | null;
  /** The grace window applied (ms), for display. */
  graceMs: number | null;
}

/** Grace for a given interval: max(floor, fraction * interval). */
export function graceForInterval(intervalMs: number | null): number {
  if (intervalMs === null) return LIMITS.JOBS_GRACE_MIN_MS;
  return Math.max(LIMITS.JOBS_GRACE_MIN_MS, Math.round(LIMITS.JOBS_GRACE_FRACTION * intervalMs));
}

/** Newest run by start time (runs may arrive out of order). */
export function latestRun(runs: readonly JobRunView[]): JobRunView | null {
  if (runs.length === 0) return null;
  return runs.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
}

/**
 * Evaluate a job's health at `now`. Overdue means the schedule says it should
 * have fired (plus grace) but no run has been reported since that expected time.
 */
export function evaluateJob(job: JobView, now: number): JobHealthResult {
  const last = latestRun(job.runs);
  if (job.status === "paused") {
    return { health: "paused", nextExpectedRun: null, lastRun: last, graceMs: null };
  }
  const fields = parseCron(job.scheduleCron);
  if (!fields) {
    return { health: "unparsable", nextExpectedRun: null, lastRun: last, graceMs: null };
  }
  const interval = estimateIntervalMs(fields, now);
  const grace = graceForInterval(interval);

  // The moment the schedule should next fire from the last observed point.
  const anchor = last ? last.startedAt : job.updatedAt;
  const expected = nextRun(fields, anchor);

  if (!last) {
    // Never run: overdue only if the first expected run + grace has already passed.
    if (expected !== null && now > expected + grace) {
      return { health: "overdue", nextExpectedRun: expected, lastRun: null, graceMs: grace };
    }
    return { health: "never-run", nextExpectedRun: expected, lastRun: null, graceMs: grace };
  }

  if (expected !== null && now > expected + grace) {
    return { health: "overdue", nextExpectedRun: expected, lastRun: last, graceMs: grace };
  }
  // Healthy: report the NEXT firing after now for display.
  return { health: "ok", nextExpectedRun: nextRun(fields, now), lastRun: last, graceMs: grace };
}

/** Aggregate health counts for the metrics card. */
export interface JobsSummary {
  total: number;
  overdue: number;
  failing: number;
  runsReported: number;
  paused: number;
}

export function summarizeJobs(jobs: readonly JobView[], now: number): JobsSummary {
  let overdue = 0;
  let failing = 0;
  let runsReported = 0;
  let paused = 0;
  for (const job of jobs) {
    const h = evaluateJob(job, now);
    if (h.health === "overdue") overdue++;
    if (h.health === "paused") paused++;
    const last = h.lastRun;
    if (last?.status === "failed") failing++;
    runsReported += job.runs.length;
  }
  return { total: jobs.length, overdue, failing, runsReported, paused };
}
