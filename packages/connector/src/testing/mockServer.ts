/**
 * A tiny real HTTP server for exercising the connector against the wire (test
 * support only — NOT exported from the package entry point).
 *
 * Tests drive the client through actual `fetch` → `node:http` → handler, so the
 * assertions cover real header serialisation, status/error mapping, query
 * encoding, and byte bodies — not a mocked `fetch`. Each request is recorded so a
 * test can assert exactly what the client put on the wire (including that the
 * `Authorization` header is the only place the token appears).
 */

import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface RecordedRequest {
  method: string;
  /** Path without the query string. */
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  /** Parsed JSON body when the content-type was JSON, else undefined. */
  body: unknown;
  /** Raw request body text. */
  rawBody: string;
}

export interface MockResponse {
  status?: number;
  /** JSON body — serialised and sent with a JSON content-type. */
  json?: unknown;
  /** Raw body (bytes or text) — takes precedence over `json` when set. */
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}

export type MockHandler = (req: RecordedRequest) => MockResponse | Promise<MockResponse>;

export interface MockServerHandle {
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Start a mock Canvas HTTP server; resolves once it is listening. */
export async function startMockServer(handler: MockHandler): Promise<MockServerHandle> {
  const requests: RecordedRequest[] = [];
  const server: Server = createServer((req, res) => {
    void (async () => {
      const rawBody = await readBody(req);
      const url = new URL(req.url ?? "/", "http://localhost");
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers[k] = v;
        else if (Array.isArray(v)) headers[k] = v.join(", ");
      }
      let body: unknown;
      if (rawBody && (headers["content-type"] ?? "").includes("application/json")) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = undefined;
        }
      }
      const recorded: RecordedRequest = {
        method: req.method ?? "GET",
        path: url.pathname,
        query: url.searchParams,
        headers,
        body,
        rawBody,
      };
      requests.push(recorded);

      let result: MockResponse;
      try {
        result = await handler(recorded);
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code: "mock_handler_threw", message: String(err) } }));
        return;
      }

      const status = result.status ?? 200;
      const outHeaders: Record<string, string> = { ...result.headers };
      let payload: string | Uint8Array;
      if (result.body !== undefined) {
        payload = result.body;
        if (!("content-type" in outHeaders) && typeof payload === "string") {
          outHeaders["content-type"] = "text/plain";
        }
      } else if (result.json !== undefined) {
        payload = JSON.stringify(result.json);
        outHeaders["content-type"] = outHeaders["content-type"] ?? "application/json";
      } else {
        payload = "";
      }
      res.writeHead(status, outHeaders);
      res.end(payload);
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Convenience: the contract error envelope shape for programming failures. */
export function errorBody(code: string, message: string, detail?: unknown): MockResponse["json"] {
  return { error: detail === undefined ? { code, message } : { code, message, detail } };
}
