import type { ApiError } from "@hermes/contract";
import {
  archiveArtifactSchema,
  createArtifactSchema,
  createTabSchema,
  ERROR_STATUS,
  jobRegistrationSchema,
  patchTabSchema,
  postMessageSchema,
  runReportSchema,
  updateArtifactSchema,
  updatesQuerySchema,
} from "@hermes/contract";
import { httpRouter } from "convex/server";
import type { z } from "zod";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
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

/** Guard: run `fn` only if the request carries a valid service token. */
function authed(fn: (request: Request) => Promise<Response>) {
  return httpAction(async (_ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    return fn(request);
  });
}

const http = httpRouter();

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
    const res = await ctx.runQuery(api.canvas.pendingWork, { cursor: parsed.data.cursor });
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
    const res = await ctx.runQuery(api.canvas.listArtifacts, {});
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
    const res = await ctx.runQuery(api.canvas.readArtifact, {
      artifact_id: id,
      seq: seqParam ? Number(seqParam) : undefined,
    });
    if (!res) return errorResponse({ code: "not_found", message: `artifact ${id} not found` });
    return json(200, res);
  }),
});

http.route({
  pathPrefix: ARTIFACT_PREFIX,
  method: "PATCH",
  handler: authed(async (request) => {
    const url = new URL(request.url);
    const id = url.pathname.slice(ARTIFACT_PREFIX.length);
    if (!id) return errorResponse({ code: "not_found", message: "artifact id required" });
    const body = await parseBody(request, updateArtifactSchema);
    if (!body.ok) return body.response;
    // Delegation happens inside the wrapper below (needs ctx); see patchArtifact.
    return patchArtifact(id, body.data);
  }),
});

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

// PATCH needs ctx; the `authed` wrapper hides it, so this closure is defined at
// module scope and re-acquires ctx through a dedicated httpAction. To keep one
// delegation point we instead inline ctx above — redefine PATCH without `authed`:
http.routes = http.routes.filter((r) => !(r[0] === ARTIFACT_PREFIX && r[1] === "PATCH"));
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

// --- GET /agent/attachments/:id (serving owned by COURIER/files*) ----------
http.route({
  pathPrefix: "/agent/attachments/",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    if (!(await verifyServiceToken(request.headers.get("Authorization")))) {
      return errorResponse({ code: "unauthorized", message: "missing or invalid service token" });
    }
    // Attachment byte serving (nosniff + attachment disposition) is implemented in
    // `files*` (COURIER, plan §7); LEDGER owns the contract, not the serving path.
    return json(501, { error: { code: "not_implemented", message: "attachment serving is provided by files* (COURIER)" } });
  }),
});

/** jobs/runs and patchTab return either {ok:true} or a rejection outcome. */
function outcomeIshResponse(res: { ok: true } | { ok: false; error: ApiError }): Response {
  return res.ok ? json(200, res) : errorResponse(res.error);
}

export default http;
