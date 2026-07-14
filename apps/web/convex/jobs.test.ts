/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

/**
 * Jobs read-query specs (WP8 / Gate G6). `jobs.listJobs` is the owner-guarded live
 * view the Jobs tab subscribes to. Proves: owner-gated (anon rejected); jobs +
 * their runs are returned (runs newest-first, bounded); a registered job with a
 * reported run appears live. Overdue math is unit-tested separately in
 * `components/jobs/overdue.test.ts`.
 */

const modules = import.meta.glob("./**/!(*.test).*s");
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };

describe("jobs.listJobs", () => {
  it("returns registered jobs with their runs (owner-gated, newest run first)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.agentWrites.registerJob, {
      key: "backup",
      name: "Nightly backup",
      schedule_cron: "0 3 * * *",
      description: "snapshot export",
      source: "hermes-box",
    });
    await t.mutation(internal.agentWrites.reportRun, {
      key: "backup",
      run_id: "run-1",
      status: "succeeded",
      started_at: 1_000,
      finished_at: 2_000,
      summary: "ok",
      log_tail: "done.",
    });
    await t.mutation(internal.agentWrites.reportRun, {
      key: "backup",
      run_id: "run-2",
      status: "failed",
      started_at: 5_000,
      summary: "boom",
    });

    const jobs = await t.withIdentity(OWNER).query(api.jobs.listJobs, {});
    expect(jobs.length).toBe(1);
    const job = jobs[0]!;
    expect(job.key).toBe("backup");
    expect(job.schedule_cron).toBe("0 3 * * *");
    expect(job.runs.length).toBe(2);
    // newest-first
    expect(job.runs[0]!.run_id).toBe("run-2");
    expect(job.runs[0]!.status).toBe("failed");
    expect(job.runs[1]!.log_tail).toBe("done.");
  });

  it("rejects an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.agentWrites.registerJob, {
      key: "j",
      name: "J",
      schedule_cron: "* * * * *",
    });
    await expect(t.query(api.jobs.listJobs, {})).rejects.toThrow();
  });

  it("returns an empty array when no jobs are registered", async () => {
    const t = convexTest(schema, modules);
    const jobs = await t.withIdentity(OWNER).query(api.jobs.listJobs, {});
    expect(jobs).toEqual([]);
  });
});
