/**
 * App-origin CSP builder — runtime mirror of `@hermes/policy` `buildAppCsp`
 * (OWNER: ATLAS wiring, WARDEN policy; spec §2.3).
 *
 * `next.config.mjs` runs under plain Node before Next's TS transpile, so it
 * cannot import the TypeScript `@hermes/policy`. This is the byte-identical JS
 * mirror it imports instead. `appCsp.test.ts` guards that this stays exactly
 * equal to the policy output (dev and prod) — a divergence fails the suite, so
 * the security-relevant string still has a single source of truth.
 *
 * Keep in lockstep with `packages/policy/src/csp.ts::buildAppCsp`.
 */

/**
 * @param {{ convexCloud: string, convexSite: string, contentHost: string }} hosts
 * @param {{ dev?: boolean }} [opts]
 * @returns {string}
 */
export function buildAppCsp({ convexCloud, convexSite, contentHost }, opts = {}) {
  const convexWs = convexCloud ? convexCloud.replace(/^https:\/\//, "wss://") : "";
  const join = (tokens) => tokens.filter(Boolean).join(" ");

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
  return [
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
  ].join("; ");
}

/**
 * Resolve the CSP hosts from env (build/start time). Mirrors
 * `IntegrationApp.convexSiteUrl` for the `*.convex.cloud` → `*.convex.site`
 * derivation. In demo mode (`NEXT_PUBLIC_CONVEX_URL` unset) the Convex tokens are
 * empty and filtered, leaving a clean `'self'`-only posture.
 *
 * @param {Record<string, string | undefined>} env
 */
export function appCspHostsFromEnv(env) {
  const convexCloud = (env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(/\/+$/, "");
  const convexSite = convexCloud
    ? convexCloud.replace(/\.convex\.cloud(?=\/|$)/, ".convex.site")
    : "";
  const contentHost = (env.NEXT_PUBLIC_CONTENT_ORIGIN ?? "https://hermes-canvas-content.vercel.app").replace(
    /\/+$/,
    "",
  );
  return { convexCloud, convexSite, contentHost };
}
