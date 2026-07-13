import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { isDemoBypassEnabled } from "@hermes/env";
import { NextResponse } from "next/server";

/**
 * Route protection for the owner app (OWNER: ATLAS, plan §6).
 *
 * Unauthenticated visits to any app route are redirected to `/signin`; a signed-in
 * owner who hits `/signin` is bounced to the workspace. This is a redirect only —
 * the real authorization boundary is in the Convex functions (`authGuard`,
 * `authPolicy`), never here (plan §6: "the frontend is not a trust boundary").
 *
 * Two escape hatches, both fail-safe:
 *   - No `NEXT_PUBLIC_CONVEX_URL` (a Convex-less local/demo build) → pass through,
 *     since there is no deployment to authenticate against.
 *   - The explicit non-production demo bypass (`@hermes/env`) → pass through for
 *     local demo runs. This is false in production regardless of any flag, so a
 *     deployed owner app is always gated.
 */

const isSignInPage = createRouteMatcher(["/signin"]);

// Evaluated once at module load. In a real deployment both are false, so the full
// Convex Auth middleware is active.
const authDisabled = !process.env.NEXT_PUBLIC_CONVEX_URL || isDemoBypassEnabled();

const protect = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (isSignInPage(request)) {
    return authed ? nextjsMiddlewareRedirect(request, "/") : undefined;
  }
  if (!authed) return nextjsMiddlewareRedirect(request, "/signin");
  return undefined;
});

export default authDisabled ? () => NextResponse.next() : protect;

export const config = {
  // Run on everything except Next internals and files with an extension.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
