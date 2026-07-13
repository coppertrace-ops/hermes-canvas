/**
 * Hard caps and rate limits for the Canvas API (plan §2.2).
 *
 * These are the single source of truth for every size/rate boundary. They are
 * consumed by the pure validators (`validate.ts`), the rate limiter
 * (`ratelimit.ts`), the Convex mutations, and the generated tool manifest, so a
 * limit can never be described in one place and enforced differently in another.
 *
 * Enforcement rule (binding): exceeding a size cap is a *visible rejection with
 * the limit named*, never a silent truncation (plan §2.2, §3).
 */

/** Bytes in one KiB / MiB — sizes below are measured on the UTF-8 byte length. */
const KIB = 1024;
const MIB = 1024 * 1024;

export const LIMITS = {
  /** Max stored size of a single artifact version's content. */
  VERSION_CONTENT_BYTES: 256 * KIB,
  /** Max size of a single uploaded attachment. */
  ATTACHMENT_BYTES: 10 * MIB,
  /** Max size of a single chat message body. */
  MESSAGE_BYTES: 32 * KIB,
  /** Max size of a job run's captured log tail. */
  JOB_LOG_TAIL_BYTES: 16 * KIB,
  /** Max length of the required `why` justification on a write. */
  WHY_MAX_CHARS: 200,
  /** Max length of an artifact/tab/job title. */
  TITLE_MAX_CHARS: 200,

  /** Per-artifact write ceiling (thrash / injection blast-radius control). */
  WRITES_PER_MIN_PER_ARTIFACT: 20,
  /** Global agent write ceiling across all artifacts. */
  AGENT_WRITES_PER_MIN_GLOBAL: 60,
  /** Streaming chat chunks are coalesced at or above this cadence. */
  MESSAGE_COALESCE_MS: 500,

  /** Sliding window all rate limits are measured over. */
  RATE_WINDOW_MS: 60_000,
} as const;

export type Limits = typeof LIMITS;

/**
 * UTF-8 byte length of a string, matching how content size is stored and capped.
 * `TextEncoder` is available in the Convex runtime, Node ≥18, and browsers.
 */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}
