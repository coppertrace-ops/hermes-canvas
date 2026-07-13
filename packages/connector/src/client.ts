/**
 * `HermesCanvasClient` — the authenticated HTTPS client for the deployed Canvas
 * `/agent/*` surface (OWNER: LEDGER, plan §2.1–§2.2).
 *
 * This is the agent's only write path. It:
 *   - attaches `Authorization: Bearer <serviceToken>` to every request and
 *     NEVER logs, echoes, or otherwise surfaces that token (the optional
 *     `onRequest` hook receives pre-redacted metadata only — never headers);
 *   - validates every response against the frozen `@hermes/contract` schemas so
 *     server drift is a raised error, not a silent type lie;
 *   - re-raises the server's structured `ApiError` bodies as typed
 *     `ConnectorHttpError`s the host can branch on.
 *
 * Transport is the platform `fetch` (Node ≥ 22 ships it globally); an alternate
 * implementation may be injected for testing or custom agents.
 */

import type {
  ApiError,
  ArtifactRead,
  ArtifactSummary,
  CreateArtifact,
  CreateTab,
  JobRegistration,
  PatchTab,
  PostMessage,
  RunReport,
  UpdateArtifact,
  UpdatesResponse,
  WriteResult,
} from "@hermes/contract";
import {
  artifactReadSchema,
  artifactSummarySchema,
  ERROR_CODES,
  updatesResponseSchema,
  writeResultSchema,
} from "@hermes/contract";
import { z } from "zod";
import { ConnectorHttpError, ConnectorNetworkError, ConnectorResponseError } from "./errors";

/** The minimal `fetch` shape the client needs — lets tests/hosts inject one. */
export type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

/** Redacted, token-free metadata emitted after each request for observability. */
export interface RequestLogEvent {
  method: string;
  /** Path only — query string is stripped so nothing sensitive is ever logged. */
  path: string;
  status: number;
  ok: boolean;
  duration_ms: number;
}

export interface ConnectorOptions {
  /** Base URL of the Convex HTTP actions host (e.g. `https://<deployment>.convex.site`). */
  baseUrl: string;
  /** 256-bit bearer service token. Held in memory only; never logged. */
  serviceToken: string;
  /** Per-request timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** Alternate fetch implementation (defaults to the global `fetch`). */
  fetch?: FetchLike;
  /**
   * Optional observability hook. Receives token-free, query-free metadata after
   * every request (success or failure). Provided so hosts can wire logging
   * WITHOUT ever handling the bearer token themselves.
   */
  onRequest?: (event: RequestLogEvent) => void;
  /**
   * When true (default), responses are validated against the contract schemas.
   * Set false only to tolerate a server ahead of the pinned contract.
   */
  validate?: boolean;
  /** Injectable clock (epoch millis). Defaults to `Date.now`. Used for timing. */
  now?: () => number;
}

/** A binary body returned by an attachment read. */
export interface AttachmentBytes {
  bytes: Uint8Array;
  content_type: string | null;
  content_disposition: string | null;
}

/** Result shape of the tab/job write endpoints (thin `{ ok }` / `{ tab_id }`). */
export interface TabWriteResult {
  tab_id: string;
}

const tabWriteResultSchema = z.object({ tab_id: z.string() });
const okResultSchema = z.object({ ok: z.literal(true) });
const messageResultSchema = z.object({ message_id: z.string() });
const listArtifactsSchema = z.object({ artifacts: z.array(artifactSummarySchema) });
const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    detail: z.unknown().optional(),
  }),
});

interface RequestSpec {
  method: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class HermesCanvasClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private readonly onRequest?: (event: RequestLogEvent) => void;
  private readonly validate: boolean;
  private readonly now: () => number;

  constructor(options: ConnectorOptions) {
    if (!options.baseUrl) throw new Error("ConnectorOptions.baseUrl is required");
    if (!options.serviceToken) throw new Error("ConnectorOptions.serviceToken is required");
    // Strip a trailing slash so `${baseUrl}${path}` is always well-formed.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.serviceToken = options.serviceToken;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    const injected = options.fetch;
    if (!injected && typeof fetch !== "function") {
      throw new Error("no global fetch available; pass ConnectorOptions.fetch");
    }
    this.fetchImpl = injected ?? ((input, init) => (fetch as unknown as FetchLike)(input, init));
    this.onRequest = options.onRequest;
    this.validate = options.validate ?? true;
    this.now = options.now ?? (() => Date.now());
  }

  // -- Reads -----------------------------------------------------------------

  /** `GET /agent/updates?cursor=` — new messages + events since a cursor. */
  async getUpdates(cursor = 0): Promise<UpdatesResponse> {
    const body = await this.request({ method: "GET", path: "/agent/updates", query: { cursor } });
    return this.parse(updatesResponseSchema, body, "GET /agent/updates");
  }

  /** `GET /agent/artifacts` — every artifact's current head summary. */
  async listArtifacts(): Promise<ArtifactSummary[]> {
    const body = await this.request({ method: "GET", path: "/agent/artifacts" });
    return this.parse(listArtifactsSchema, body, "GET /agent/artifacts").artifacts;
  }

  /** `GET /agent/artifacts/:id?seq=` — current content, or a historical version. */
  async readArtifact(artifactId: string, seq?: number): Promise<ArtifactRead> {
    const body = await this.request({
      method: "GET",
      path: `/agent/artifacts/${encodeURIComponent(artifactId)}`,
      query: seq === undefined ? undefined : { seq },
    });
    return this.parse(artifactReadSchema, body, "GET /agent/artifacts/:id");
  }

  /** `GET /agent/attachments/:id` — the raw bytes the human sees. */
  async getAttachment(attachmentId: string): Promise<AttachmentBytes> {
    return this.requestBinary(`/agent/attachments/${encodeURIComponent(attachmentId)}`);
  }

  // -- Messages --------------------------------------------------------------

  /** `POST /agent/messages` — post `{text}` or stream `{stream_id, delta, done?}`. */
  async postMessage(message: PostMessage): Promise<{ message_id: string }> {
    const body = await this.request({ method: "POST", path: "/agent/messages", body: message });
    return this.parse(messageResultSchema, body, "POST /agent/messages");
  }

  /** Convenience: post a whole assistant message in one shot. */
  postText(text: string): Promise<{ message_id: string }> {
    return this.postMessage({ text });
  }

  /** Convenience: append a streaming delta under a stable `stream_id`. */
  postDelta(streamId: string, delta: string, done?: boolean): Promise<{ message_id: string }> {
    return this.postMessage(
      done === undefined ? { stream_id: streamId, delta } : { stream_id: streamId, delta, done },
    );
  }

  // -- Artifact writes -------------------------------------------------------

  /** `POST /agent/artifacts` — create an artifact; returns the write result. */
  async createArtifact(input: CreateArtifact): Promise<WriteResult> {
    const body = await this.request({ method: "POST", path: "/agent/artifacts", body: input });
    return this.parse(writeResultSchema, body, "POST /agent/artifacts");
  }

  /**
   * `PATCH /agent/artifacts/:id` — update an artifact. Pass a `replace_all` or a
   * `region` edit; a stale `parent_seq` still lands (append-only) but the result
   * is flagged `contended`.
   */
  async updateArtifact(artifactId: string, input: UpdateArtifact): Promise<WriteResult> {
    const body = await this.request({
      method: "PATCH",
      path: `/agent/artifacts/${encodeURIComponent(artifactId)}`,
      body: input,
    });
    return this.parse(writeResultSchema, body, "PATCH /agent/artifacts/:id");
  }

  /** `POST /agent/artifacts/:id/archive` — soft-archive (reversible; no delete exists). */
  async archiveArtifact(artifactId: string, why: string): Promise<WriteResult> {
    const body = await this.request({
      method: "POST",
      path: `/agent/artifacts/${encodeURIComponent(artifactId)}/archive`,
      body: { why },
    });
    return this.parse(writeResultSchema, body, "POST /agent/artifacts/:id/archive");
  }

  // -- Tabs ------------------------------------------------------------------

  /** `PUT /agent/tabs` — create a tab. Removal is archive-only. */
  async createTab(input: CreateTab): Promise<TabWriteResult> {
    const body = await this.request({ method: "PUT", path: "/agent/tabs", body: input });
    return this.parse(tabWriteResultSchema, body, "PUT /agent/tabs");
  }

  /** `PATCH /agent/tabs/:id` — rename, reorder, or archive a tab. */
  async patchTab(tabId: string, patch: PatchTab): Promise<{ ok: true }> {
    const body = await this.request({
      method: "PATCH",
      path: `/agent/tabs/${encodeURIComponent(tabId)}`,
      body: patch,
    });
    return this.parse(okResultSchema, body, "PATCH /agent/tabs/:id");
  }

  // -- Jobs ------------------------------------------------------------------

  /** `PUT /agent/jobs/:key` — register or update a scheduled-job descriptor. */
  async registerJob(key: string, registration: JobRegistration): Promise<{ ok: true }> {
    const body = await this.request({
      method: "PUT",
      path: `/agent/jobs/${encodeURIComponent(key)}`,
      body: registration,
    });
    return this.parse(okResultSchema, body, "PUT /agent/jobs/:key");
  }

  /** `POST /agent/jobs/:key/runs` — report a run at start and completion. */
  async reportRun(key: string, report: RunReport): Promise<{ ok: true }> {
    const body = await this.request({
      method: "POST",
      path: `/agent/jobs/${encodeURIComponent(key)}/runs`,
      body: report,
    });
    return this.parse(okResultSchema, body, "POST /agent/jobs/:key/runs");
  }

  // -- Transport -------------------------------------------------------------

  /** Build the absolute URL for a request, appending any query params. */
  private urlFor(path: string, query?: RequestSpec["query"]): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  /** Authorization + content headers. The token lives here and nowhere else. */
  private headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.serviceToken}`,
      accept: "application/json",
    };
    if (hasBody) headers["content-type"] = "application/json";
    return headers;
  }

  /** Perform a JSON request; return the parsed body, or throw a typed error. */
  private async request(spec: RequestSpec): Promise<unknown> {
    const url = this.urlFor(spec.path, spec.query);
    const hasBody = spec.body !== undefined;
    const started = this.now();
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(url, {
        method: spec.method,
        headers: this.headers(hasBody),
        body: hasBody ? JSON.stringify(spec.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      // Network/timeout — no HTTP response was produced. Never includes the token.
      this.emit(spec, 0, false, started);
      throw new ConnectorNetworkError(
        `${spec.method} ${spec.path} failed before a response`,
        cause,
      );
    }
    this.emit(spec, res.status, res.ok, started);
    const text = await res.text();
    if (!res.ok) throw toHttpError(res.status, text);
    return parseJsonBody(text, `${spec.method} ${spec.path}`);
  }

  /** Perform a request expecting raw bytes (attachments). */
  private async requestBinary(path: string): Promise<AttachmentBytes> {
    const url = this.urlFor(path);
    const started = this.now();
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: this.headers(false),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      this.emit({ method: "GET", path }, 0, false, started);
      throw new ConnectorNetworkError(`GET ${path} failed before a response`, cause);
    }
    this.emit({ method: "GET", path }, res.status, res.ok, started);
    if (!res.ok) {
      // Error bodies are JSON even on the binary path; read as text to map them.
      const text = await res.text();
      throw toHttpError(res.status, text);
    }
    const buf = await res.arrayBuffer();
    return {
      bytes: new Uint8Array(buf),
      content_type: res.headers.get("content-type"),
      content_disposition: res.headers.get("content-disposition"),
    };
  }

  /** Emit a redacted, token-free request event to the optional hook. */
  private emit(
    spec: Pick<RequestSpec, "method" | "path">,
    status: number,
    ok: boolean,
    started: number,
  ): void {
    if (!this.onRequest) return;
    this.onRequest({
      method: spec.method,
      path: spec.path, // path only — query (and never the token) is excluded
      status,
      ok,
      duration_ms: Math.max(0, this.now() - started),
    });
  }

  /** Validate a body against a contract schema unless validation is disabled. */
  private parse<T>(schema: z.ZodType<T>, body: unknown, where: string): T {
    if (!this.validate) return body as T;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ConnectorResponseError(
        `${where} returned a body that does not match the contract`,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }
    return parsed.data;
  }
}

/** Parse a 2xx JSON body, or raise a response error if it is not JSON. */
function parseJsonBody(text: string, where: string): unknown {
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ConnectorResponseError(
      `${where} returned a non-JSON body`,
      "body was not valid JSON",
    );
  }
}

/** Map a non-2xx response to a typed error, extracting the contract envelope. */
function toHttpError(status: number, text: string): ConnectorHttpError {
  let apiError: ApiError | undefined;
  let code = "http_error";
  let message = text.slice(0, 500) || `request failed with status ${status}`;
  try {
    const parsed = apiErrorEnvelopeSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      const raw = parsed.data.error;
      code = raw.code;
      message = raw.message;
      // Only tag it as a contract ApiError when the code is one we recognise.
      if ((ERROR_CODES as readonly string[]).includes(raw.code)) {
        apiError = {
          code: raw.code as ApiError["code"],
          message: raw.message,
          detail: raw.detail as ApiError["detail"],
        };
      }
    }
  } catch {
    // Non-JSON error body; fall through with the raw text as the message.
  }
  return new ConnectorHttpError(status, code, message, apiError);
}
