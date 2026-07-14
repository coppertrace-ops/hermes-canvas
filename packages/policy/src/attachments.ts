/**
 * Attachment response header policy (OWNER: WARDEN, spec §2.3).
 *
 * Attachments are served download-only, never inline: forcing
 * `Content-Type: application/octet-stream` + `X-Content-Type-Options: nosniff` +
 * `Content-Disposition: attachment` denies the browser any chance to sniff an
 * upload into an executable/renderable type on the app origin. The Convex HTTP
 * action (`files.ts` / `http.ts`) already enforces auth + these headers; moving
 * the constants here lets a header-assertion test pin them so they cannot
 * silently regress.
 */

/** The static, always-present attachment headers (filename set per-request). */
export const ATTACHMENT_HEADERS = {
  "Content-Type": "application/octet-stream",
  "X-Content-Type-Options": "nosniff",
  /** Base disposition; the serving layer appends the sanitized `filename*`. */
  "Content-Disposition": "attachment",
} as const;
