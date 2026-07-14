import { query } from "./_generated/server";
import { requireOwner } from "./authGuard";

/**
 * Jobs viewer read surface (OWNER: LEDGER read seam; Wave 2 P6, plan §5).
 *
 * The Canvas is Hermes' job REPORTING surface, not its scheduler: the agent
 * registers jobs (`PUT /agent/jobs/:key`) and posts run records
 * (`POST /agent/jobs/:key/runs`) over the service-token path (already in
 * `http.ts`/`agentWrites.ts`); this owner-guarded live query is what the browser
 * Jobs tab subscribes to. Next-run computation and overdue detection are done
 * client-side (`components/jobs/cron.ts` / `overdue.ts`) so the server stays a
 * plain reader — a dead scheduler is surfaced by the viewer, never by polling here.
 *
 * Browser-only reader ⇒ owner-guarded (the agent path reaches `jobs`/`job_runs`
 * through its own internal mutations, never this query).
 */

export interface JobRunDto {
  run_id: string;
  status: "started" | "succeeded" | "failed";
  started_at: number;
  finished_at?: number;
  summary?: string;
  log_tail?: string;
}

export interface JobDto {
  key: string;
  name: string;
  schedule_cron: string;
  description: string;
  source: string;
  status: "active" | "paused";
  updated_at: number;
  runs: JobRunDto[];
}

/** Max run records returned per job (newest first) — keeps the payload bounded. */
const MAX_RUNS_PER_JOB = 25;

export const listJobs = query({
  args: {},
  handler: async (ctx): Promise<JobDto[]> => {
    await requireOwner(ctx);
    const jobs = await ctx.db.query("jobs").collect();
    const out: JobDto[] = [];
    for (const job of jobs.sort((a, b) => a.name.localeCompare(b.name))) {
      const runRows = await ctx.db
        .query("job_runs")
        .withIndex("by_job", (q) => q.eq("job_key", job.key))
        .collect();
      const runs: JobRunDto[] = runRows
        .sort((a, b) => b.started_at - a.started_at)
        .slice(0, MAX_RUNS_PER_JOB)
        .map((r) => ({
          run_id: r.run_id,
          status: r.status,
          started_at: r.started_at,
          finished_at: r.finished_at,
          summary: r.summary,
          log_tail: r.log_tail,
        }));
      out.push({
        key: job.key,
        name: job.name,
        schedule_cron: job.schedule_cron,
        description: job.description,
        source: job.source,
        status: job.status,
        updated_at: job.updated_at,
        runs,
      });
    }
    return out;
  },
});
