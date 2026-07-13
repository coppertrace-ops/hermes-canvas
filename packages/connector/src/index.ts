/**
 * @hermes/connector — the authenticated Canvas API client for the external
 * Hermes host (OWNER: LEDGER, plan §2, §5).
 *
 * This package is plain Node (Node ≥ 22 global `fetch`) and is the agent's ONLY
 * write path to the Canvas. Per the direct-external-Hermes model there is no
 * watcher agent and no agent runtime inside Convex: this connector runs on the
 * Hermes host and turns tool calls into authenticated HTTPS requests against the
 * deployed `/agent/*` surface.
 *
 * What it provides:
 *   - `HermesCanvasClient` — typed, contract-validated request client for every
 *     `/agent/*` endpoint (messages, artifacts, tabs, jobs, attachments); the
 *     bearer service token is attached to every request and never logged.
 *   - `UpdatesPoller` — the cursor-tracking poll fallback for `GET /agent/updates`
 *     (the production default is a Convex WS `pendingWork` subscription; see
 *     `docs/hermes-host-integration.md`).
 *   - `withRunReporting` — the ready-made scheduled-job wrapper (plan §5).
 *
 * The full tool manifest and system-prompt addendum a Hermes host installs live
 * in `@hermes/contract` (`TOOL_MANIFEST`, `SYSTEM_PROMPT_ADDENDUM`) and are
 * re-exported here for convenience.
 */

export const CONNECTOR_VERSION = "1.0.0-g1" as const;

export { HermesCanvasClient } from "./client";
export type {
  AttachmentBytes,
  ConnectorOptions,
  FetchLike,
  RequestLogEvent,
  TabWriteResult,
} from "./client";

export { UpdatesPoller } from "./poller";
export type { PollerOptions, UpdatesBatch } from "./poller";

export { withRunReporting } from "./runReporting";
export type { RunContext, RunReportingOptions } from "./runReporting";

export {
  ConnectorError,
  ConnectorHttpError,
  ConnectorNetworkError,
  ConnectorResponseError,
} from "./errors";

// Re-export the manifest + addendum a host installs alongside the client.
export { SYSTEM_PROMPT_ADDENDUM, TOOL_MANIFEST } from "@hermes/contract";
export type { ToolDef } from "@hermes/contract";
