/**
 * Content-origin placeholder. WARDEN owns this app's real behavior: it serves
 * sandboxed artifact HTML from an origin distinct from the authenticated web app,
 * under a strict CSP and attachment header policy (see @hermes/policy). Phase 0
 * ships only this static placeholder so the second origin exists and deploys.
 */
export default function ContentHome() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Hermes Canvas — content origin</h1>
      <p>Static placeholder. Sandboxed artifact rendering is owned by WARDEN.</p>
    </main>
  );
}
