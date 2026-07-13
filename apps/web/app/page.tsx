import { isDemoBypassEnabled } from "@hermes/env";

/**
 * Phase-0 placeholder home page. Proves the app boots and that the ATLAS-owned
 * `@hermes/env` boundary is importable from the web app. Chat/canvas surfaces are
 * added by later agents (GLASS, PANES, …) — do not build product UI here.
 */
export default function HomePage() {
  const demo = isDemoBypassEnabled();
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", lineHeight: 1.5 }}>
      <h1>Hermes Canvas</h1>
      <p>Phase 0 foundation is live. Feature surfaces are added by later agents.</p>
      <p>Demo auth bypass: {demo ? "enabled (non-production)" : "disabled"}</p>
    </main>
  );
}
