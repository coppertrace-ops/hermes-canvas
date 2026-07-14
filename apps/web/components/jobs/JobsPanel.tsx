"use client";

/**
 * Live Jobs tab (PANES; Wave 2 P6, plan §5). Subscribes to the owner-guarded
 * `jobs.listJobs` query and maps the DTOs into the pure `JobsView` view models.
 * Must be mounted under a Convex provider (only the live workspace mounts it,
 * behind the `jobs_tab` flag). All rendering + overdue math live in `JobsView` /
 * `overdue.ts`; this file is data only.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { JobsView } from "./JobsView";
import type { JobView } from "./overdue";

export function JobsPanel() {
  const jobs = useQuery(api.jobs.listJobs, {});
  const views: JobView[] | undefined = jobs?.map((j) => ({
    key: j.key,
    name: j.name,
    scheduleCron: j.schedule_cron,
    description: j.description,
    source: j.source,
    status: j.status,
    updatedAt: j.updated_at,
    runs: j.runs.map((r) => ({
      runId: r.run_id,
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      summary: r.summary,
      logTail: r.log_tail,
    })),
  }));
  return <JobsView jobs={views} />;
}
