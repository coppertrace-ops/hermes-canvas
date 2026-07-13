import { IntegrationApp } from "../components/integration";

/**
 * Home — the assembled Wave 1 workspace (OWNER: PROOF integration).
 *
 * Mounts the integration shell, which composes the owned chat / canvas / history
 * subsystems through their public seams. The shell is a client component; this
 * server component is the thin entry point.
 */
export default function HomePage() {
  return <IntegrationApp />;
}
