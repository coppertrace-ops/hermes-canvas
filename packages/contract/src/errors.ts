/**
 * Structured, machine-readable API errors (plan §2.2).
 *
 * Every rejection the agent can hit is one of these codes with a stable shape,
 * so Hermes' connector can branch on `code` rather than parse prose. Size
 * rejections always name the limit and the actual value; contention is NOT an
 * error (the write lands) — it is a flag on the resulting version.
 */

export const ERROR_CODES = [
  "unauthorized", // bad / missing bearer token
  "not_found", // unknown artifact / tab / job
  "validation_failed", // body failed zod / type-specific validation
  "oversize", // content exceeded a named byte cap
  "rate_limited", // per-artifact or global write ceiling hit (HTTP 429)
  "archived", // write targeted an archived artifact
  "conflict", // structural conflict the server refuses (not contention)
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The HTTP status each error code maps to at the transport layer. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  not_found: 404,
  validation_failed: 422,
  oversize: 413,
  rate_limited: 429,
  archived: 409,
  conflict: 409,
};

/** Machine-readable detail attached to oversize rejections (never truncates). */
export interface OversizeDetail {
  /** Which named cap was exceeded, e.g. "VERSION_CONTENT_BYTES". */
  limit: keyof typeof import("./limits").LIMITS;
  /** The enforced ceiling, in the same unit as `actual`. */
  limit_value: number;
  /** The rejected value that exceeded the ceiling. */
  actual: number;
  /** Unit the two numbers are expressed in. */
  unit: "bytes" | "chars" | "count";
}

/** Machine-readable detail attached to rate-limit rejections. */
export interface RateLimitDetail {
  scope: "artifact" | "global";
  /** Ceiling within the window. */
  limit: number;
  /** Milliseconds until at least one slot frees up. */
  retry_after_ms: number;
}

export interface ApiError {
  code: ErrorCode;
  /** Human-readable, safe to show; always names the limit for size errors. */
  message: string;
  detail?: OversizeDetail | RateLimitDetail | Record<string, unknown>;
}

/**
 * A structured API error carried as a thrown value inside the pure core and the
 * Convex mutations. The HTTP layer serialises `.toResponse()`; the in-memory
 * core surfaces `.error` directly to tests.
 */
export class CanvasError extends Error {
  readonly error: ApiError;
  constructor(error: ApiError) {
    super(error.message);
    this.name = "CanvasError";
    this.error = error;
  }
  get status(): number {
    return ERROR_STATUS[this.error.code];
  }
  static oversize(detail: OversizeDetail): CanvasError {
    return new CanvasError({
      code: "oversize",
      message: `content exceeds ${String(detail.limit)} (${detail.actual} ${detail.unit} > limit ${detail.limit_value} ${detail.unit})`,
      detail,
    });
  }
  static rateLimited(detail: RateLimitDetail): CanvasError {
    return new CanvasError({
      code: "rate_limited",
      message: `rate limit exceeded for ${detail.scope} writes (limit ${detail.limit}/min); retry after ${detail.retry_after_ms} ms`,
      detail,
    });
  }
  static validation(message: string, detail?: Record<string, unknown>): CanvasError {
    return new CanvasError({ code: "validation_failed", message, detail });
  }
  static notFound(what: string): CanvasError {
    return new CanvasError({ code: "not_found", message: `${what} not found` });
  }
  static archived(id: string): CanvasError {
    return new CanvasError({ code: "archived", message: `artifact ${id} is archived and cannot be written` });
  }
  static unauthorized(): CanvasError {
    return new CanvasError({ code: "unauthorized", message: "missing or invalid service token" });
  }
}
