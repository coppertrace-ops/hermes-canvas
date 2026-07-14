/**
 * Content-Security-Policy strings (OWNER: WARDEN, spec §2.3 — the egress kill).
 *
 * Two origins, two policies, one source. Both are generated here so the content
 * shell (WARDEN), the app `next.config.mjs` headers (ATLAS), and the header
 * assertions (`e2e/security/assert-headers.mjs`) all compare against the exact
 * same bytes — a header cannot silently drift from what the tests assert.
 *
 * Directives are joined with "; " and NOT terminated with a trailing ";", so the
 * output is a stable, byte-exact string suitable for equality assertions.
 */

/** Join CSP directives into the canonical single-line header value. */
function csp(directives: readonly string[]): string {
  return directives.join("; ");
}

/**
 * Content-origin CSP (spec §2.3) — applied to EVERY path of the content app.
 *
 * `default-src 'none'` denies everything not explicitly re-allowed. The frame is
 * an opaque origin (sandboxed, no `allow-same-origin`), so `'unsafe-inline'`
 * script is safe *here only*: there are no cookies/DOM/storage of ours to steal
 * and every exfil channel is closed —
 *   - `connect-src 'none'`  kills fetch / XHR / WebSocket / sendBeacon
 *   - `img-src data: blob:` kills image beacons INCLUDING CSS `url()` backgrounds
 *   - `form-action 'none'`  kills form-post exfil
 *   - `base-uri 'none'`     blocks `<base>` retargeting
 *   - `frame-ancestors <appOrigin>` lets only the app embed it (defense in depth
 *     with the app's `frame-src` pin).
 * Zero external origins. No CDN allowlist. An artifact can compute; it cannot
 * phone home.
 *
 * @param appOrigin exact web-app origin allowed to embed the frame (e.g.
 *   `https://hermes-canvas.vercel.app`). No trailing slash.
 */
export function buildContentCsp(appOrigin: string): string {
  return csp([
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${appOrigin}`,
  ]);
}

export interface AppCspHosts {
  /** Convex realtime host, `*.convex.cloud` origin (no trailing slash). */
  convexCloud: string;
  /** Convex HTTP-action host, `*.convex.site` origin (no trailing slash). */
  convexSite: string;
  /** Content origin that hosts the sandbox frame (no trailing slash). */
  contentHost: string;
}

/**
 * App-origin CSP (spec §2.3 app hardening) — shipped by the `web` app via
 * `next.config.mjs` `headers()` so it applies on Vercel and locally.
 *
 *   - `img-src 'self' data: blob: <convexSite>` — closes the Markdown
 *     image-beacon channel app-wide (the exfil pattern that leaked ≥7 products)
 *     while still allowing Convex-served attachment images.
 *   - `connect-src 'self' <convexCloud> wss://<convexCloud> <convexSite>` — MUST
 *     keep the Convex WebSocket alive (regression-tested in WP4).
 *   - `frame-src <contentHost>` EXACTLY — authorizes the sandbox mount and blocks
 *     a hostile artifact self-navigating the frame to an attacker URL.
 *   - `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors
 *     'none'`.
 *
 * `script-src`/`style-src` concession: Next.js App Router injects inline
 * bootstrap scripts and inline styles without a nonce by default, so
 * `'unsafe-inline'` is required for the app to run. This is a documented
 * concession (see `docs/threat-model.md`): the app origin has NO untrusted-HTML
 * injection surface — Markdown is sanitized with no raw-HTML passthrough,
 * `javascript:` stripped, external images blocked — so inline-script XSS has no
 * entry point here. It is NOT the same risk class as the sandbox frame.
 *
 * The `wss://` connect-src entry is derived from the `convexCloud` host by
 * swapping the scheme, so callers pass the `https://` origin once.
 *
 * `opts.dev` adds ONLY the allowances Next.js dev-mode needs and that are never
 * shipped to production: `'unsafe-eval'` (React Refresh / webpack HMR eval) and
 * `ws://localhost:*` / `http://localhost:*` connect sources (the HMR socket). The
 * default (prod) string carries neither — the security-relevant CSP is the prod
 * one, and a header-assertion runs against a production build.
 */
export function buildAppCsp(
  { convexCloud, convexSite, contentHost }: AppCspHosts,
  opts: { dev?: boolean } = {},
): string {
  const convexWs = convexCloud ? convexCloud.replace(/^https:\/\//, "wss://") : "";
  // Empty hosts (demo mode: no Convex configured) are filtered so the directive
  // stays clean `'self'`-only rather than carrying blank tokens.
  const join = (tokens: readonly string[]): string => tokens.filter(Boolean).join(" ");

  const scriptSrc = join(["script-src", "'self'", "'unsafe-inline'", opts.dev ? "'unsafe-eval'" : ""]);
  const imgSrc = join(["img-src", "'self'", "data:", "blob:", convexSite]);
  const connectSrc = join([
    "connect-src",
    "'self'",
    convexCloud,
    convexWs,
    convexSite,
    ...(opts.dev ? ["ws://localhost:*", "http://localhost:*"] : []),
  ]);
  return csp([
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    imgSrc,
    "font-src 'self'",
    connectSrc,
    `frame-src ${contentHost}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]);
}
