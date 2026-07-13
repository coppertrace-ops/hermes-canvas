/**
 * @hermes/connector — Canvas API client for the external Hermes host.
 *
 * OWNERSHIP: LEDGER (plan §2, §5). ATLAS created this boundary only. LEDGER
 * implements the authenticated HTTPS client, the Convex WS `pendingWork`
 * subscription with `GET /agent/updates` poll fallback, and `withRunReporting`.
 *
 * Direct-external-Hermes model (plan, binding): there is NO watcher agent and NO
 * agent runtime inside Convex. This connector runs on the Hermes host and is the
 * agent's only write path.
 */

export const CONNECTOR_VERSION = "0.0.0-pre-g1" as const;

/** Options a Hermes host passes to construct the client (shape target). */
export interface ConnectorOptions {
  /** Base URL of the Convex HTTP actions host (…convex.site). */
  baseUrl: string;
  /** 256-bit bearer service token (never logged). */
  serviceToken: string;
}
