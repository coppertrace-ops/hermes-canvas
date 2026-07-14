import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

/**
 * Rendered dynamically, never statically prerendered at build. `SignInForm` reads
 * `useAuthActions()` from the Convex Auth provider, which is only mounted when a
 * Convex client is configured (`app/providers.tsx`). Static export at build time
 * has no provider, so prerendering would crash on `useAuthActions()` returning
 * undefined. Sign-in depends on runtime auth state anyway — it is inherently
 * dynamic. (Fixes a pre-existing `next build` failure; the WP0 ledger recorded the
 * build green in error — see docs/gates.md WP4.)
 */
export const dynamic = "force-dynamic";

/**
 * Owner sign-in (OWNER: ATLAS, plan §6).
 *
 * Thin server entry for the closed-owner sign-in surface. There is no public
 * sign-up form and no user management — the only account that can exist is
 * `OWNER_EMAIL`, created once through the guarded bootstrap flow (see the
 * "First-time setup" affordance and docs/runbook.md).
 *
 * `SignInForm` reads `useSearchParams` (the `?setup=1` bootstrap toggle), which
 * Next 15 requires under a Suspense boundary.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
