import { z } from "zod";
import { LIMITS } from "./limits";

/**
 * Scheduled-job registration and run-report shapes (plan §5).
 *
 * The Canvas is the *reporting surface*, not the scheduler. Hermes registers a
 * job once and posts a run record at start and completion. Overdue detection
 * (now > next expected run + grace with no report) is computed by the viewer;
 * the contract only freezes the data that flows in.
 */

export const jobStatusSchema = z.enum(["active", "paused"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const runStatusSchema = z.enum(["started", "succeeded", "failed"]);
export type RunStatus = z.infer<typeof runStatusSchema>;

/** A stable, human-authored key that identifies a job across runs. */
export const jobKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/, "job key must be url-safe (alnum . _ : -)");

export const jobRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.TITLE_MAX_CHARS),
  /** Standard 5-field cron expression; parsed for display, not executed here. */
  schedule_cron: z.string().trim().min(1).max(128),
  description: z.string().max(2000).default(""),
  /** Where the job actually runs (free-form provenance string). */
  source: z.string().max(256).default(""),
  status: jobStatusSchema.default("active"),
});
export type JobRegistration = z.infer<typeof jobRegistrationSchema>;

export const runReportSchema = z
  .object({
    run_id: z.string().trim().min(1).max(128),
    status: runStatusSchema,
    /** Epoch millis; supplied by the reporter (the Canvas is not the clock). */
    started_at: z.number().int().nonnegative(),
    finished_at: z.number().int().nonnegative().optional(),
    summary: z.string().max(2000).optional(),
    log_tail: z
      .string()
      .max(LIMITS.JOB_LOG_TAIL_BYTES, `log_tail must be <= ${LIMITS.JOB_LOG_TAIL_BYTES} bytes`)
      .optional(),
  })
  .refine((r) => r.finished_at === undefined || r.finished_at >= r.started_at, {
    message: "finished_at must be >= started_at",
    path: ["finished_at"],
  });
export type RunReport = z.infer<typeof runReportSchema>;
