# Installing the Canvas connector into the Hermes host

> OWNER: LEDGER (plan §2, §5). Status: the `@hermes/connector` package is built,
> tested, and proven against a mock of the deployed `/agent/*` surface. It is
> **not yet installed** into the running Hermes host. This document is the exact
> remaining host-level step — the one action outside this repository that makes
> the agent able to write to the Canvas.

## What is done vs. what remains

**Done (in this repo, `packages/connector`):**

- `HermesCanvasClient` — authenticated, contract-validated client for every
  `/agent/*` endpoint (messages, artifacts, tabs, jobs, attachments). The bearer
  token is attached to every request and never logged.
- `UpdatesPoller` — the cursor-tracking poll fallback for `GET /agent/updates`.
- `withRunReporting` — the ready-made scheduled-job wrapper (plan §5).
- `TOOL_MANIFEST` + `SYSTEM_PROMPT_ADDENDUM` — re-exported from `@hermes/contract`;
  one tool per endpoint, plus the three behavioural rules.
- `scripts/provision-service-token.mjs` — mints the 256-bit token, prints its
  SHA-256 for the Convex env, and reveals the raw token once to the TTY only.
- HTTP/mock-server tests covering headers, request bodies, error mapping, the
  polling cursor, and the job-run lifecycle (`pnpm --filter @hermes/connector test`).

**Remaining (host-level, outside this repo — see “The one remaining step”):**

Install the connector into Hermes' actual runtime: set the two env values,
register the tools from `TOOL_MANIFEST`, and route each tool call to the matching
`HermesCanvasClient` method. Until that is done, no live Hermes host is wired to
this Canvas — this package is prepared and proven, not connected.

## 1. Provision the service token (one time, per deployment)

```
pnpm --filter @hermes/connector provision:token
```

This prints, to normal stdout (safe to capture):

```
npx convex env set HERMES_SERVICE_TOKEN_SHA256 <64-hex sha256>
```

Run that against the Canvas Convex deployment so it stores only the **hash**
(`convex/lib/agentAuth.ts` compares hashes in constant time; the plaintext never
lives in the deployment env).

The **raw token** is shown once, only on the invoking terminal. Copy it into the
Hermes host runtime env as `HERMES_SERVICE_TOKEN`. It is not recoverable — to
rotate, re-run the script and update both sides (Convex env hash + host env).

## 2. Configure the host env

The Hermes host runtime needs exactly two values:

| Env var                       | Where it goes     | Value                              |
| ----------------------------- | ----------------- | ---------------------------------- |
| `HERMES_CANVAS_BASE_URL`      | Hermes host       | `https://<deployment>.convex.site` |
| `HERMES_SERVICE_TOKEN`        | Hermes host       | the raw token from step 1          |
| `HERMES_SERVICE_TOKEN_SHA256` | Convex deployment | the hash from step 1               |

## 3. Construct the client once at host startup

```ts
import { HermesCanvasClient } from "@hermes/connector";

const canvas = new HermesCanvasClient({
  baseUrl: process.env.HERMES_CANVAS_BASE_URL!,
  serviceToken: process.env.HERMES_SERVICE_TOKEN!,
  // Optional: token-free, query-free request telemetry. The hook NEVER receives
  // headers or the token — safe to log directly.
  onRequest: (e) => host.log.debug("canvas", e),
});
```

## 4. Register the tools and wire each call

The manifest is the single source of truth for the agent's tool config. Register
each tool from `TOOL_MANIFEST` and prepend `SYSTEM_PROMPT_ADDENDUM` to Hermes'
system prompt (`docs/agent-api.md` is the same content, generated from the
contract):

```ts
import { TOOL_MANIFEST, SYSTEM_PROMPT_ADDENDUM } from "@hermes/connector";

for (const tool of TOOL_MANIFEST) {
  host.registerTool({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  });
}
host.appendSystemPrompt(SYSTEM_PROMPT_ADDENDUM);
```

Route each tool name to the matching client method. The client returns the
structured result (including the new `head_seq` and any `contended` flag) so the
model can chain edits correctly:

| Tool name                 | Client call                                 |
| ------------------------- | ------------------------------------------- |
| `canvas_get_updates`      | `canvas.getUpdates(cursor)`                 |
| `canvas_post_message`     | `canvas.postMessage(input)`                 |
| `canvas_list_artifacts`   | `canvas.listArtifacts()`                    |
| `canvas_read_artifact`    | `canvas.readArtifact(artifact_id, seq?)`    |
| `canvas_create_artifact`  | `canvas.createArtifact(input)`              |
| `canvas_update_artifact`  | `canvas.updateArtifact(artifact_id, input)` |
| `canvas_archive_artifact` | `canvas.archiveArtifact(artifact_id, why)`  |
| `canvas_create_tab`       | `canvas.createTab(input)`                   |
| `canvas_update_tab`       | `canvas.patchTab(tab_id, patch)`            |
| `canvas_register_job`     | `canvas.registerJob(key, registration)`     |
| `canvas_report_run`       | `canvas.reportRun(key, report)`             |
| `canvas_get_attachment`   | `canvas.getAttachment(attachment_id)`       |

Errors arrive as typed exceptions the host can surface to the model verbatim:
`ConnectorHttpError` (`.status`, `.code`, `.apiError`) for server rejections,
`ConnectorNetworkError` for transport failures, `ConnectorResponseError` for
contract drift.

## 5. Waiting for user turns

The plan's default is a Convex WebSocket subscription to `pendingWork` (function
calls only on change; a 24/7 HTTP poll would burn ~1.7M calls/month against the
1M free tier). That subscription is a thin future addition on the same auth. The
**shipped, tested** path here is the poll fallback:

```ts
import { UpdatesPoller } from "@hermes/connector";

const poller = new UpdatesPoller(canvas, {
  intervalMs: 2000,
  onBatch: ({ messages, events, cursor }) => host.deliverToAgent(messages, events),
});
void poller.start(); // runs until poller.stop()
```

The poller owns the cursor: it advances only on success, never re-delivers, and
never regresses on an empty poll.

## 6. Scheduled jobs

Register each job once, then wrap the body:

```ts
import { withRunReporting } from "@hermes/connector";

await canvas.registerJob("nightly-export", {
  name: "Nightly export",
  schedule_cron: "0 3 * * *",
  description: "Exports the workspace snapshot",
  source: "hermes-host",
  status: "active",
});

await withRunReporting(canvas, "nightly-export", async (ctx) => {
  ctx.log("starting export");
  // …do the work…
  ctx.setSummary("exported 42 rows");
});
```

`withRunReporting` posts a `started` run before the body and a `succeeded` /
`failed` run after (sharing one `run_id`), with a bounded `log_tail`. A failed
job is reported before its error propagates — the viewer's overdue/failed states
exist precisely to expose a scheduler that dies quietly.

## The one remaining step

**Everything above except this section is complete and tested in-repo.** The
single action that remains — and it must happen in Hermes' own runtime, which
this repository does not control — is:

> Set `HERMES_CANVAS_BASE_URL` + `HERMES_SERVICE_TOKEN` in the Hermes host env
> (and `HERMES_SERVICE_TOKEN_SHA256` in the Convex deployment), then register
> `TOOL_MANIFEST` in the host's tool config and route each tool name to the
> `HermesCanvasClient` method in the table above.

No live Hermes host is wired to this Canvas yet. Do not treat the agent as
connected until that host-side installation is done and a real `canvas_post_message`
round-trips against the deployment.
