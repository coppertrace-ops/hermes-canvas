/**
 * Size / rate / grace limits (OWNER: WARDEN).
 *
 * The single source of truth for the numeric policy the app enforces. Byte caps
 * mirror the contract's server-side limits; the jobs grace constants back the
 * overdue-detection math in the Jobs tab (spec §3.3).
 *
 * Existing consumers (`files.ts`, `chat/attachments.ts`) read `LIMITS`
 * field-for-field — the shape is stable and additive-only.
 */

export const LIMITS = {
  /** Max bytes of a single artifact version's content. */
  maxVersionBytes: 256 * 1024,
  /** Max bytes of a single uploaded attachment (10 MB). */
  maxAttachmentBytes: 10 * 1024 * 1024,
  /** Max bytes of a single chat message body. */
  maxMessageBytes: 32 * 1024,

  /**
   * Jobs overdue grace (spec §3.3): a job is "missed / not reporting" once
   * `now > nextExpectedRun + grace` with no run reported. Grace is
   * `max(JOBS_GRACE_MIN_MS, JOBS_GRACE_FRACTION * intervalMs)` so a fast cron
   * gets a proportionally small grace and a slow cron a floor of 10 minutes. A
   * dead scheduler that looks healthy is the silent-failure class this surfaces.
   */
  JOBS_GRACE_MIN_MS: 10 * 60 * 1000,
  JOBS_GRACE_FRACTION: 0.25,
} as const;
