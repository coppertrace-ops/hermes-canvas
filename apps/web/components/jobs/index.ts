/**
 * Jobs / cron viewer surface (PANES; Wave 2 P6, plan §5). Live runs, human-readable
 * schedule, computed next-run, and overdue detection so a silently-dead scheduler
 * is visible in-product. Rendered as a right-pane view behind the `jobs_tab` flag.
 */

export { JobsView } from "./JobsView";
export type { JobsViewProps } from "./JobsView";
export { JobsPanel } from "./JobsPanel";
export { parseCron, describeCron, nextRun, estimateIntervalMs } from "./cron";
export type { CronFields } from "./cron";
export { evaluateJob, summarizeJobs, graceForInterval, latestRun } from "./overdue";
export type { JobView, JobRunView, JobHealth, JobHealthResult, JobsSummary } from "./overdue";
