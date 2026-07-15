import { LIMITS } from "./limits";
import {
  AGENT_STATUS_BODY_MAX_BYTES,
  MEMORY_ENTRY_CONTENT_MAX_BYTES,
  MEMORY_SYNC_MAX_ENTRIES,
} from "./status";
import {
  TOOL_ARGS_SUMMARY_MAX_BYTES,
  TOOL_CALL_UPSERTS_PER_MIN,
  TOOL_ERROR_MESSAGE_MAX_BYTES,
  TOOL_RESULT_TAIL_MAX_BYTES,
} from "./toolCall";

/**
 * Hermes tool manifest — the single source for the agent's tool config and for
 * `docs/agent-api.md` (plan §2.3). One tool per model-facing `/agent/*` endpoint.
 *
 * The JSON-schema shapes here are authored by hand but draw every numeric cap
 * and enum from the contract constants (`LIMITS`, the zod enums), so the manifest
 * cannot describe a different limit than the server enforces. (A zod→JSON-Schema
 * codegen pass is a later, non-correctness optimisation.)
 *
 * Plugin-infrastructure endpoints (the gateway's own status/memory reporting) are
 * NOT tools — the model never calls them — so they live in `INFRA_ENDPOINTS`
 * below and render into the doc's Infrastructure section, not the Tools section.
 */

export interface ToolDef {
  name: string;
  method: string;
  path: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const artifactTypeEnum = ["markdown", "mermaid", "html-static", "board"];

export const TOOL_MANIFEST: ToolDef[] = [
  {
    name: "canvas_get_updates",
    method: "GET",
    path: "/agent/updates",
    description:
      "Fetch new user messages and events since a cursor. Fallback for the WebSocket pendingWork subscription; poll only when the socket is unavailable.",
    input_schema: {
      type: "object",
      properties: { cursor: { type: "integer", minimum: 0, default: 0 } },
    },
  },
  {
    name: "canvas_post_message",
    method: "POST",
    path: "/agent/messages",
    description: `Post an assistant chat message. Either {text} for a whole message or {stream_id, delta, done?} to stream. Chunks are coalesced at >= ${LIMITS.MESSAGE_COALESCE_MS} ms; ${LIMITS.MESSAGE_BYTES} bytes max per message.`,
    input_schema: {
      oneOf: [
        { type: "object", required: ["text"], properties: { text: { type: "string" } } },
        {
          type: "object",
          required: ["stream_id", "delta"],
          properties: {
            stream_id: { type: "string" },
            delta: { type: "string" },
            done: { type: "boolean" },
          },
        },
      ],
    },
  },
  {
    name: "canvas_list_artifacts",
    method: "GET",
    path: "/agent/artifacts",
    description: "List all artifacts with their current head_seq, type, title, tab, and status.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "canvas_read_artifact",
    method: "GET",
    path: "/agent/artifacts/:id",
    description:
      "Read an artifact's current content, or a historical version via ?seq=. Always read before writing so you have a fresh parent_seq.",
    input_schema: {
      type: "object",
      required: ["artifact_id"],
      properties: { artifact_id: { type: "string" }, seq: { type: "integer", minimum: 1 } },
    },
  },
  {
    name: "canvas_create_artifact",
    method: "POST",
    path: "/agent/artifacts",
    description: `Create a canvas artifact. 'why' is required (<= ${LIMITS.WHY_MAX_CHARS} chars); content <= ${LIMITS.VERSION_CONTENT_BYTES} bytes.`,
    input_schema: {
      type: "object",
      required: ["type", "title", "content", "why"],
      properties: {
        type: { type: "string", enum: artifactTypeEnum },
        title: { type: "string", maxLength: LIMITS.TITLE_MAX_CHARS },
        tab_id: { type: "string" },
        content: { type: "string" },
        why: { type: "string", maxLength: LIMITS.WHY_MAX_CHARS },
      },
    },
  },
  {
    name: "canvas_update_artifact",
    method: "PATCH",
    path: "/agent/artifacts/:id",
    description:
      "Update a canvas artifact. Prefer region edits; always base on the seq you last read. A stale parent_seq still lands (append-only) but is flagged contended.",
    input_schema: {
      type: "object",
      required: ["artifact_id", "parent_seq", "why", "edit"],
      properties: {
        artifact_id: { type: "string" },
        parent_seq: { type: "integer", minimum: 0 },
        why: { type: "string", maxLength: LIMITS.WHY_MAX_CHARS },
        edit: {
          oneOf: [
            {
              type: "object",
              required: ["mode", "content"],
              properties: { mode: { const: "replace_all" }, content: { type: "string" } },
            },
            {
              type: "object",
              required: ["mode", "anchor", "content"],
              properties: {
                mode: { const: "region" },
                anchor: {
                  oneOf: [
                    { type: "object", required: ["heading"], properties: { heading: { type: "string" } } },
                    {
                      type: "object",
                      required: ["start_line", "end_line"],
                      properties: {
                        start_line: { type: "integer", minimum: 1 },
                        end_line: { type: "integer", minimum: 1 },
                      },
                    },
                  ],
                },
                content: { type: "string" },
              },
            },
          ],
        },
      },
    },
  },
  {
    name: "canvas_archive_artifact",
    method: "POST",
    path: "/agent/artifacts/:id/archive",
    description: "Soft-archive an artifact (reversible). There is no delete endpoint.",
    input_schema: {
      type: "object",
      required: ["artifact_id", "why"],
      properties: {
        artifact_id: { type: "string" },
        why: { type: "string", maxLength: LIMITS.WHY_MAX_CHARS },
      },
    },
  },
  {
    name: "canvas_create_tab",
    method: "PUT",
    path: "/agent/tabs",
    description: "Create a tab. Removal is archive-only.",
    input_schema: {
      type: "object",
      required: ["title"],
      properties: { title: { type: "string", maxLength: LIMITS.TITLE_MAX_CHARS }, order: { type: "integer" } },
    },
  },
  {
    name: "canvas_update_tab",
    method: "PATCH",
    path: "/agent/tabs/:id",
    description: "Rename, reorder, or archive a tab.",
    input_schema: {
      type: "object",
      required: ["tab_id"],
      properties: {
        tab_id: { type: "string" },
        title: { type: "string", maxLength: LIMITS.TITLE_MAX_CHARS },
        order: { type: "integer" },
        status: { type: "string", enum: ["active", "archived"] },
      },
    },
  },
  {
    name: "canvas_register_job",
    method: "PUT",
    path: "/agent/jobs/:key",
    description: "Register or update a scheduled job for the cron viewer. The Canvas reports runs; it does not schedule them.",
    input_schema: {
      type: "object",
      required: ["key", "name", "schedule_cron"],
      properties: {
        key: { type: "string" },
        name: { type: "string", maxLength: LIMITS.TITLE_MAX_CHARS },
        schedule_cron: { type: "string" },
        description: { type: "string" },
        source: { type: "string" },
        status: { type: "string", enum: ["active", "paused"] },
      },
    },
  },
  {
    name: "canvas_report_run",
    method: "POST",
    path: "/agent/jobs/:key/runs",
    description: `Report a job run at start and completion. log_tail <= ${LIMITS.JOB_LOG_TAIL_BYTES} bytes.`,
    input_schema: {
      type: "object",
      required: ["key", "run_id", "status", "started_at"],
      properties: {
        key: { type: "string" },
        run_id: { type: "string" },
        status: { type: "string", enum: ["started", "succeeded", "failed"] },
        started_at: { type: "integer" },
        finished_at: { type: "integer" },
        summary: { type: "string" },
        log_tail: { type: "string" },
      },
    },
  },
  {
    name: "canvas_get_attachment",
    method: "GET",
    path: "/agent/attachments/:id",
    description: "Read a user-shared file — the same bytes the human sees. Served with nosniff + attachment disposition.",
    input_schema: {
      type: "object",
      required: ["attachment_id"],
      properties: { attachment_id: { type: "string" } },
    },
  },
];

/**
 * Plugin-infrastructure endpoints on the service-token `/agent/*` surface that are
 * NOT model-facing tools: the external Hermes gateway reports its own runtime
 * state and mirrors the host memory store; the owner's Settings panel reads them
 * back via Convex queries. Documented for the plugin author, never surfaced to the
 * model — so they are excluded from `TOOL_MANIFEST` and rendered separately.
 */
export const INFRA_ENDPOINTS: ToolDef[] = [
  {
    name: "agent_report_status",
    method: "PUT",
    path: "/agent/status",
    description: `Report the gateway's runtime state (model, provider, effort, context usage, toolsets, sessions, …). Upserts a singleton; the server stamps reported_at. Body <= ${AGENT_STATUS_BODY_MAX_BYTES} bytes.`,
    input_schema: {
      type: "object",
      required: ["model", "provider"],
      properties: {
        model: { type: "string" },
        provider: { type: "string" },
        effort: { type: "string" },
        fallbacks: { type: "array", items: { type: "string" } },
        context: {
          type: "object",
          properties: {
            used_tokens: { type: "integer", minimum: 0 },
            max_tokens: { type: "integer", minimum: 0 },
          },
        },
        gateway: {
          type: "object",
          properties: { version: { type: "string" }, uptime_s: { type: "number", minimum: 0 } },
        },
        toolsets: { type: "array", items: { type: "string" } },
        platforms: { type: "array", items: { type: "string" } },
        sessions_active: { type: "integer", minimum: 0 },
        memory: {
          type: "object",
          properties: { provider: { type: "string" }, recall_budget: { type: "number", minimum: 0 } },
        },
      },
    },
  },
  {
    name: "agent_sync_memory",
    method: "PUT",
    path: "/agent/memory",
    description: `Bulk-mirror the host memory store. Upserts each entry by entry_id; with full:true, local rows absent from the payload are removed (this table mirrors host state, it is not the append-only ledger). <= ${MEMORY_SYNC_MAX_ENTRIES} entries/request; content <= ${MEMORY_ENTRY_CONTENT_MAX_BYTES} bytes each.`,
    input_schema: {
      type: "object",
      required: ["entries"],
      properties: {
        entries: {
          type: "array",
          maxItems: MEMORY_SYNC_MAX_ENTRIES,
          items: {
            type: "object",
            required: ["entry_id", "content"],
            properties: {
              entry_id: { type: "string" },
              content: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              source: { type: "string" },
              created_at: { type: "integer", minimum: 0 },
              updated_at: { type: "integer", minimum: 0 },
            },
          },
        },
        full: { type: "boolean" },
      },
    },
  },
  {
    name: "agent_report_tool_call",
    method: "PUT",
    path: "/agent/tool-calls/:tool_call_id",
    description: `Report a tool-call receipt for the owner's live chat timeline. Post {status:"running"} at start, then a terminal status (ok|error|blocked) at completion — the SAME tool_call_id updates the row in place; a single completed post creates the finished row directly. Subagent tools report with their own session_id. Receipts arrive pre-redacted + host-truncated, and the caps are re-enforced server-side (no bypass): args_summary <= ${TOOL_ARGS_SUMMARY_MAX_BYTES} bytes, result_tail <= ${TOOL_RESULT_TAIL_MAX_BYTES} bytes, error_message <= ${TOOL_ERROR_MESSAGE_MAX_BYTES} bytes. These receipts are chatty, so they have their own ${TOOL_CALL_UPSERTS_PER_MIN}/min upsert budget, separate from the artifact/message write ceiling.`,
    input_schema: {
      type: "object",
      required: ["tool", "status"],
      properties: {
        tool: { type: "string" },
        status: { type: "string", enum: ["running", "ok", "error", "blocked"] },
        args_summary: { type: "string" },
        result_tail: { type: "string" },
        error_message: { type: "string" },
        session_id: { type: "string" },
        turn_id: { type: "string" },
        started_at: { type: "integer", minimum: 0 },
        finished_at: { type: "integer", minimum: 0 },
        duration_ms: { type: "integer", minimum: 0 },
      },
    },
  },
];

/** The behavioural addendum delivered with the manifest (plan §2.3). */
export const SYSTEM_PROMPT_ADDENDUM = [
  "You write to the Canvas through these tools only. Three rules the evidence demands:",
  "1. Read before write: base every update on the seq you last read (fresh parent_seq). A stale parent still lands but is flagged contended.",
  "2. Prefer region edits over regenerating whole documents — region edits are the defence against truncation/overwrite failures.",
  "3. Give an honest one-line `why` on every write. It is stored next to the server's record of what actually happened.",
].join("\n");

/** Render `docs/agent-api.md` from the manifest — deterministic, no clock. */
export function renderAgentApiMarkdown(): string {
  const lines: string[] = [];
  lines.push("# Hermes Canvas — Agent API (v1)");
  lines.push("");
  lines.push("> Generated from `packages/contract` (`renderAgentApiMarkdown`). Do not hand-edit.");
  lines.push("");
  lines.push("Base URL: `https://<deployment>.convex.site` · Auth: `Authorization: Bearer ${HERMES_SERVICE_TOKEN}`");
  lines.push("");
  lines.push("## Behavioural rules");
  lines.push("");
  for (const line of SYSTEM_PROMPT_ADDENDUM.split("\n")) lines.push(`> ${line}`);
  lines.push("");
  lines.push("## Limits");
  lines.push("");
  lines.push("| Limit | Value |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(LIMITS)) lines.push(`| \`${k}\` | ${v} |`);
  lines.push("");
  lines.push("## Tools");
  lines.push("");
  for (const t of TOOL_MANIFEST) {
    lines.push(`### \`${t.name}\` — \`${t.method} ${t.path}\``);
    lines.push("");
    lines.push(t.description);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(t.input_schema, null, 2));
    lines.push("```");
    lines.push("");
  }
  lines.push("## Infrastructure endpoints");
  lines.push("");
  lines.push(
    "> Service-token endpoints the Hermes gateway calls to report its own state. These are NOT model tools — the model never invokes them — and are consumed only by the owner's Settings panel.",
  );
  lines.push("");
  for (const t of INFRA_ENDPOINTS) {
    lines.push(`### \`${t.name}\` — \`${t.method} ${t.path}\``);
    lines.push("");
    lines.push(t.description);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(t.input_schema, null, 2));
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n") + "\n";
}
