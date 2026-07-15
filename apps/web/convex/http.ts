import type { ApiError } from "@hermes/contract";
import {
  AGENT_STATUS_BODY_MAX_BYTES,
  agentStatusSchema,
  archiveArtifactSchema,
  byteLength,
  createArtifactSchema,
  createTabSchema,
  ERROR_STATUS,
  jobRegistrationSchema,
  memorySyncSchema,
  patchTabSchema,
  postMessageSchema,
  runReportSchema,
  toolCallIdSchema,
  toolCallUpsertSchema,
  updateArtifactSchema,
  updatesQuerySchema,
} from "@hermes/contract";
import { httpRouter } from "convex/server";
import type { z } from "zod";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { respondWithAttachment, serveAttachment } from "./files";
import { verifyServiceToken } from "./lib/agentAuth";
import type { WriteOutcome } from "./lib/outcome";

/**
 * `/agent/*` HTTP surface (OWNER: LEDGER, plan §2.1–§2.2).
 *
 * Every route: (1) verifies the service token, (2) zod-validates the body via the
 * contract schemas, (3) delegates to a mutation/query. Enforcement lives in the
 * mutations (so there is no HTTP-layer bypass); this file is transport only —
 * auth, parse, route, and error-shape mapping.
 */

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-content-type-options": "nosniff" },
  });
}

function errorResponse(error: ApiError): Response {
  return json(ERROR_STATUS[error.code], { error });
}

/** Map a mutation's WriteOutcome to an HTTP response. */
function outcomeResponse(outcome: WriteOutcome): Response {
  return outcome.ok ? json(200, outcome.result) : errorResponse(outcome.error);
}

/** Parse+validate a JSON body against a zod schema, or return a 422 response. */
async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: errorResponse({ code: "validation_failed", message: "body is not valid JSON" }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse({ code: "validation_failed", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), detail: { issues: parsed.error.issues } }),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Like `parseBody`, but first rejects a body whose raw UTF-8 size exceeds
 * `maxBytes` with a structured `oversize` error naming the cap (never a silent
 * truncation). Used for the fixed-size infra reporting bodies (`/agent/status`).
 */
async function parseCappedBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes: number,
  limitName: string,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const rawText = await request.text();
  const size = byteLength(rawText);
  if (size > maxBytes) {
    return {
      ok: false,
      response: errorResponse({
        code: "oversize",
        message: `body exceeds ${limitName} (${size} bytes > limit ${maxBytes} bytes)`,
        detail: { limit: limitName, limit_value: maxBytes, actual: size, unit: "bytes" },
      }),
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { ok: false, response: errorResponse({ code: "validation_failed", message: "body is not valid JSON" }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse({ code: "validation_failed", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), detail: { issues: parsed.error.issues } }),
    };
  }
  return { ok: true, data: parsed.data };
}

const http = httpRouter();

// Convex Auth sign-in/sign-out/token HTTP endpoints (OWNER: ATLAS, plan §6).
// Mounted here because Convex serves exactly one HTTP router; this is auth wiring
// only and does not touch the `/agent/*` transport below.
auth.addHttpRoutes(http);

// --- GET /agent/updates ----------------------------------------------------
http.route({
  path: "/agent/updates",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const parsed = updatesQuerySchema.safeParse({ cursor: url.searchParams.get("cursor") ?? undefined });
    if (!parsed.success) return errorResponse({ code: "validation_failed", message: "invalid cursor" });
    const res = await ctx.runQuery(internal.canvas.pendingWork, { cursor: parsed.data.cursor });
    return json(200, res);
  }),
});

// --- POST /agent/updates/ack — durable human-message delivery ack ----------
http.route({
  path: "/agent/updates/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return errorResponse({ code: "validation_failed", message: "body is not valid JSON" });
    }
    const message_ids =
      raw && typeof raw === "object" && Array.isArray((raw as { message_ids?: unknown }).message_ids)
        ? ((raw as { message_ids: unknown[] }).message_ids.filter((x) => typeof x === "string") as string[])
        : null;
    if (!message_ids) {
      return errorResponse({ code: "validation_failed", message: "message_ids: required string array" });
    }
    const res = await ctx.runMutation(internal.human.ackHumanMessages, { message_ids });
    return json(200, res);
  }),
});

// --- GET /agent/artifacts (list) + POST /agent/artifacts (create) ---------
http.route({
  path: "/agent/artifacts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const res = await ctx.runQuery(internal.canvas.listArtifactsForAgent, {});
    return json(200, { artifacts: res });
  }),
});

http.route({
  path: "/agent/artifacts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const body = await parseBody(request, createArtifactSchema);
    if (!body.ok) return body.response;
    const outcome = await ctx.runMutation(internal.agentWrites.createArtifact, {
      type: body.data.type,
      title: body.data.title,
      tab_id: body.data.tab_id,
      content: body.data.content,
      why: body.data.why,
    });
    return outcomeResponse(outcome);
  }),
});

// --- /agent/artifacts/:id (read, update, archive) -------------------------
const ARTIFACT_PREFIX = "/agent/artifacts/";

http.route({
  pathPrefix: ARTIFACT_PREFIX,
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const id = url.pathname.slice(ARTIFACT_PREFIX.length);
    if (!id) return errorResponse({ code: "not_found", message: "artifact id required" });
    const seqParam = url.searchParams.get("seq");
    const res = await ctx.runQuery(internal.canvas.readArtifactForAgent, {
      artifact_id: id,
      seq: seqParam ? Number(seqParam) : undefined,
    });
    if (!res) return errorResponse({ code: "not_found", message: `artifact ${id} not found` });
    return json(200, res);
  }),
});

// PATCH needs the Convex request context, so it is implemented directly below.
http.route({
  pathPrefix: ARTIFACT_PREFIX,
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    let id = url.pathname.slice(ARTIFACT_PREFIX.length);
    if (!id.endsWith("/archive")) {
      return errorResponse({ code: "not_found", message: "unsupported artifact sub-path" });
    }
    id = id.slice(0, -"/archive".length);
    const body = await parseBody(request, archiveArtifactSchema);
    if (!body.ok) return body.response;
    const outcome = await ctx.runMutation(internal.agentWrites.archiveArtifact, { artifact_id: id, why: body.data.why });
    return outcomeResponse(outcome);
  }),
});

// PATCH /agent/artifacts/:id
http.route({
  pathPrefix: ARTIFACT_PREFIX,
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const id = url.pathname.slice(ARTIFACT_PREFIX.length);
    if (!id) return errorResponse({ code: "not_found", message: "artifact id required" });
    const body = await parseBody(request, updateArtifactSchema);
    if (!body.ok) return body.response;
    const outcome = await ctx.runMutation(internal.agentWrites.updateArtifact, {
      artifact_id: id,
      parent_seq: body.data.parent_seq,
      why: body.data.why,
      edit: body.data.edit,
    });
    return outcomeResponse(outcome);
  }),
});

// --- POST /agent/messages --------------------------------------------------
http.route({
  path: "/agent/messages",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const body = await parseBody(request, postMessageSchema);
    if (!body.ok) return body.response;
    const d = body.data;
    const outcome = await ctx.runMutation(
      internal.agentWrites.postMessage,
      "text" in d ? { text: d.text } : { stream_id: d.stream_id, delta: d.delta, done: d.done },
    );
    return outcome.ok ? json(200, { message_id: outcome.message_id }) : errorResponse(outcome.error);
  }),
});

// --- PUT /agent/tabs + PATCH /agent/tabs/:id ------------------------------
http.route({
  path: "/agent/tabs",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const body = await parseBody(request, createTabSchema);
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentWrites.createTab, { title: body.data.title, order: body.data.order });
    return json(200, res);
  }),
});

const TAB_PREFIX = "/agent/tabs/";
http.route({
  pathPrefix: TAB_PREFIX,
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const id = url.pathname.slice(TAB_PREFIX.length);
    if (!id) return errorResponse({ code: "not_found", message: "tab id required" });
    const body = await parseBody(request, patchTabSchema);
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentWrites.patchTab, {
      tab_id: id as never, // Convex Id<"tabs">; validated to exist inside the mutation
      title: body.data.title,
      order: body.data.order,
      status: body.data.status,
    });
    return json(200, res);
  }),
});

// --- PUT /agent/jobs/:key + POST /agent/jobs/:key/runs --------------------
const JOB_PREFIX = "/agent/jobs/";
http.route({
  pathPrefix: JOB_PREFIX,
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const key = url.pathname.slice(JOB_PREFIX.length);
    if (!key || key.includes("/")) return errorResponse({ code: "not_found", message: "job key required" });
    const body = await parseBody(request, jobRegistrationSchema);
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentWrites.registerJob, {
      key,
      name: body.data.name,
      schedule_cron: body.data.schedule_cron,
      description: body.data.description,
      source: body.data.source,
      status: body.data.status,
    });
    return json(200, res);
  }),
});

http.route({
  pathPrefix: JOB_PREFIX,
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const url = new URL(request.url);
    const rest = url.pathname.slice(JOB_PREFIX.length);
    if (!rest.endsWith("/runs")) return errorResponse({ code: "not_found", message: "expected /agent/jobs/:key/runs" });
    const key = rest.slice(0, -"/runs".length);
    if (!key || key.includes("/")) return errorResponse({ code: "not_found", message: "job key required" });
    const body = await parseBody(request, runReportSchema);
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentWrites.reportRun, {
      key,
      run_id: body.data.run_id,
      status: body.data.status,
      started_at: body.data.started_at,
      finished_at: body.data.finished_at,
      summary: body.data.summary,
      log_tail: body.data.log_tail,
    });
    return outcomeIshResponse(res);
  }),
});

// --- PUT /agent/tool-calls/:tool_call_id — live tool-call receipts ----------
// NOT a model tool: the Hermes gateway reports tool-call telemetry here and the
// owner's chat timeline renders it as live-updating rows. Upserts by
// tool_call_id (start posts `running`; completion patches in place; a
// completed-only post creates the finished row). Caps + a dedicated rate limit
// are enforced inside the mutation (no HTTP-layer bypass).
const TOOL_CALL_PREFIX = "/agent/tool-calls/";
http.route({
  pathPrefix: TOOL_CALL_PREFIX,
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const rawId = new URL(request.url).pathname.slice(TOOL_CALL_PREFIX.length);
    const parsedId = toolCallIdSchema.safeParse(decodeURIComponent(rawId));
    if (!parsedId.success) return errorResponse({ code: "not_found", message: "valid tool_call_id required" });
    const body = await parseBody(request, toolCallUpsertSchema);
    if (!body.ok) return body.response;
    const d = body.data;
    const res = await ctx.runMutation(internal.agentToolCalls.upsertToolCall, {
      tool_call_id: parsedId.data,
      tool: d.tool,
      status: d.status,
      args_summary: d.args_summary,
      result_tail: d.result_tail,
      error_message: d.error_message,
      session_id: d.session_id,
      turn_id: d.turn_id,
      started_at: d.started_at,
      finished_at: d.finished_at,
      duration_ms: d.duration_ms,
    });
    return res.ok ? json(200, res) : errorResponse(res.error);
  }),
});

// --- GET /agent/attachments/:id --------------------------------------------
// Serve the raw bytes the human shared, to the service-token agent. Auth is the
// service token (verified here); the byte policy (nosniff + attachment
// disposition + 10 MB serve refusal) lives in `files.respondWithAttachment`, so
// the agent and human serving paths cannot diverge.
const AGENT_ATTACHMENT_PREFIX = "/agent/attachments/";
http.route({
  pathPrefix: AGENT_ATTACHMENT_PREFIX,
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const id = new URL(request.url).pathname.slice(AGENT_ATTACHMENT_PREFIX.length);
    if (!id) return errorResponse({ code: "not_found", message: "attachment id required" });
    return respondWithAttachment(ctx, id);
  }),
});

// --- PUT /agent/status — gateway self-report (plugin infrastructure) --------
// NOT a model tool: the Hermes gateway reports its own runtime state here. Upserts
// a singleton; the mutation server-stamps reported_at. Body is size-capped.
http.route({
  path: "/agent/status",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const body = await parseCappedBody(request, agentStatusSchema, AGENT_STATUS_BODY_MAX_BYTES, "AGENT_STATUS_BODY_MAX_BYTES");
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentInfra.upsertAgentStatus, body.data);
    return json(200, res);
  }),
});

// --- PUT /agent/memory — bulk mirror sync of the host memory store ----------
// NOT a model tool. Upserts each entry by entry_id; full:true removes local rows
// the payload omits (this table mirrors host state, not the append-only ledger).
http.route({
  path: "/agent/memory",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    const body = await parseBody(request, memorySyncSchema);
    if (!body.ok) return body.response;
    const res = await ctx.runMutation(internal.agentInfra.syncMemories, { entries: body.data.entries, full: body.data.full });
    return json(200, res);
  }),
});

// --- GET /attachments/:id (human download) ---------------------------------
// The owner's own download link. Owner-guarded inside `serveAttachment`; same
// byte policy as the agent path above.
http.route({
  pathPrefix: "/attachments/",
  method: "GET",
  handler: serveAttachment,
});

/** jobs/runs and patchTab return either {ok:true} or a rejection outcome. */
function outcomeIshResponse(res: { ok: true } | { ok: false; error: ApiError }): Response {
  return res.ok ? json(200, res) : errorResponse(res.error);
}

export default http;
