/**
 * Connector-side error types (OWNER: LEDGER, plan §2).
 *
 * The `/agent/*` surface returns structured `ApiError` bodies (see
 * `@hermes/contract`); the connector re-raises them as typed exceptions so a
 * Hermes host can branch on `err.code` rather than parse prose. Two failure
 * classes exist:
 *
 *   - `ConnectorHttpError` — the server answered with a non-2xx status. Carries
 *     the parsed `ApiError` (when the body was the contract error envelope) plus
 *     the raw HTTP status.
 *   - `ConnectorNetworkError` — the request never produced an HTTP response
 *     (DNS/TLS/connection/timeout). Carries the underlying cause.
 *
 * A third, `ConnectorResponseError`, is raised when a 2xx body does not match
 * the frozen contract schema — drift is surfaced, never silently accepted.
 *
 * None of these ever embed the bearer token: construction sites receive only
 * status, code, message, and body — never headers.
 */

import type { ApiError, ErrorCode } from "@hermes/contract";

/** Base class so callers can `catch (e) { if (e instanceof ConnectorError) … }`. */
export class ConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The server answered with a non-2xx status. */
export class ConnectorHttpError extends ConnectorError {
  /** HTTP status code as returned by the deployment. */
  readonly status: number;
  /**
   * The `ApiError.code` when the body was the contract error envelope, else a
   * synthetic marker (`"http_error"`). Kept as a plain string because the server
   * can legitimately return codes outside the frozen `ErrorCode` union (e.g. the
   * attachment path's `not_implemented` 501).
   */
  readonly code: ErrorCode | (string & {});
  /** The parsed contract error envelope, when the body matched it. */
  readonly apiError?: ApiError;
  /** Machine-readable detail carried by oversize / rate-limit errors. */
  readonly detail?: unknown;

  constructor(
    status: number,
    code: ConnectorHttpError["code"],
    message: string,
    apiError?: ApiError,
  ) {
    super(`HTTP ${status} ${code}: ${message}`);
    this.status = status;
    this.code = code;
    this.apiError = apiError;
    this.detail = apiError?.detail;
  }
}

/** The request never produced an HTTP response (network / timeout / abort). */
export class ConnectorNetworkError extends ConnectorError {
  override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/** A 2xx response body did not match the frozen contract schema. */
export class ConnectorResponseError extends ConnectorError {
  /** The zod (or parse) issue string, for diagnostics. */
  readonly detail: string;
  constructor(message: string, detail: string) {
    super(message);
    this.detail = detail;
  }
}
