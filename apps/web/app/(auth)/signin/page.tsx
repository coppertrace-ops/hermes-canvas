import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

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
