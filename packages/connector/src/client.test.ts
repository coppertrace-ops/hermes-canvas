import { describe, expect, it } from "vitest";
import type { ConnectorOptions } from "./client";
import { HermesCanvasClient, type RequestLogEvent } from "./client";
import { ConnectorHttpError, ConnectorNetworkError, ConnectorResponseError } from "./errors";
import {
  errorBody,
  startMockServer,
  type MockHandler,
  type RecordedRequest,
} from "./testing/mockServer";

const TOKEN = "test-token-0123456789abcdef0123456789abcdef0123456789abcdef01234567";

/** Spin up a mock server + a client pointed at it, run `body`, always close. */
async function withClient(
  handler: MockHandler,
  body: (client: HermesCanvasClient, requests: () => RecordedRequest[]) => Promise<void>,
  clientOpts: Partial<ConnectorOptions> = {},
): Promise<void> {
  const server = await startMockServer(handler);
  try {
    const client = new HermesCanvasClient({
      baseUrl: server.url,
      serviceToken: TOKEN,
      ...clientOpts,
    });
    await body(client, () => server.requests);
  } finally {
    await server.close();
  }
}

// A contract-valid WriteResult the mock returns for artifact writes.
function writeResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    artifact_id: "art_1",
    head_seq: 2,
    seq: 2,
    contended: false,
    render_state: "ok",
    resolved_action: { op: "replace_all", target: "art_1" },
    ...overrides,
  };
}

describe("HermesCanvasClient — auth + headers", () => {
  it("attaches the bearer token and JSON headers, and sends no token in the URL", async () => {
    await withClient(
      () => ({ json: writeResult({ resolved_action: { op: "create", target: "art_1" } }) }),
      async (client, requests) => {
        await client.createArtifact({
          type: "markdown",
          title: "Doc",
          content: "# hi",
          why: "seed",
        });
        const req = requests()[0]!;
        expect(req.method).toBe("POST");
        expect(req.path).toBe("/agent/artifacts");
        expect(req.headers["authorization"]).toBe(`Bearer ${TOKEN}`);
        expect(req.headers["content-type"]).toContain("application/json");
        expect(req.headers["accept"]).toContain("application/json");
        // The token must appear ONLY in the Authorization header.
        expect(req.rawBody).not.toContain(TOKEN);
        expect(req.query.toString()).not.toContain(TOKEN);
        expect(req.body).toEqual({ type: "markdown", title: "Doc", content: "# hi", why: "seed" });
      },
    );
  });

  it("never passes the token to the onRequest log hook", async () => {
    const events: RequestLogEvent[] = [];
    await withClient(
      () => ({ json: { artifacts: [] } }),
      async (client) => {
        await client.listArtifacts();
        expect(events).toHaveLength(1);
        const ev = events[0]!;
        expect(ev.method).toBe("GET");
        expect(ev.path).toBe("/agent/artifacts");
        expect(ev.status).toBe(200);
        expect(ev.ok).toBe(true);
        // No field of the event may carry the token.
        expect(JSON.stringify(ev)).not.toContain(TOKEN);
      },
      { onRequest: (e) => events.push(e) },
    );
  });
});

describe("HermesCanvasClient — requests + reads", () => {
  it("encodes the updates cursor as a query param and validates the feed", async () => {
    await withClient(
      (req) => ({
        json: { cursor: Number(req.query.get("cursor")) + 3, messages: [], events: [] },
      }),
      async (client, requests) => {
        const res = await client.getUpdates(7);
        expect(requests()[0]!.query.get("cursor")).toBe("7");
        expect(res.cursor).toBe(10);
      },
    );
  });

  it("reads a specific artifact version via ?seq= and url-encodes the id", async () => {
    const version = {
      artifact_id: "art/9",
      seq: 3,
      parent_seq: 2,
      content: "body",
      content_size: 4,
      author: "agent",
      contended: false,
      render_state: "ok",
      resolved_action: { op: "replace_all" },
      created_at: 1000,
    };
    await withClient(
      () => ({
        json: {
          artifact: {
            artifact_id: "art/9",
            type: "markdown",
            title: "Doc",
            status: "active",
            head_seq: 3,
          },
          version,
        },
      }),
      async (client, requests) => {
        const read = await client.readArtifact("art/9", 3);
        expect(read.version.seq).toBe(3);
        const req = requests()[0]!;
        expect(req.path).toBe("/agent/artifacts/art%2F9");
        expect(req.query.get("seq")).toBe("3");
      },
    );
  });

  it("sends a region update as a PATCH with the edit body", async () => {
    await withClient(
      () => ({
        json: writeResult({
          contended: true,
          resolved_action: { op: "region", target: "art_1", region: "heading:Auth" },
        }),
      }),
      async (client, requests) => {
        const res = await client.updateArtifact("art_1", {
          parent_seq: 1,
          why: "tighten auth section",
          edit: { mode: "region", anchor: { heading: "Auth" }, content: "new" },
        });
        expect(res.contended).toBe(true);
        const req = requests()[0]!;
        expect(req.method).toBe("PATCH");
        expect(req.path).toBe("/agent/artifacts/art_1");
        expect(req.body).toMatchObject({ parent_seq: 1, edit: { mode: "region" } });
      },
    );
  });

  it("posts an archive to the /archive sub-path", async () => {
    await withClient(
      () => ({ json: writeResult({ resolved_action: { op: "archive", target: "art_1" } }) }),
      async (client, requests) => {
        await client.archiveArtifact("art_1", "no longer needed");
        const req = requests()[0]!;
        expect(req.method).toBe("POST");
        expect(req.path).toBe("/agent/artifacts/art_1/archive");
        expect(req.body).toEqual({ why: "no longer needed" });
      },
    );
  });

  it("streams a message delta with stream_id/done", async () => {
    await withClient(
      () => ({ json: { message_id: "msg_1" } }),
      async (client, requests) => {
        const res = await client.postDelta("s1", "hello", true);
        expect(res.message_id).toBe("msg_1");
        expect(requests()[0]!.body).toEqual({ stream_id: "s1", delta: "hello", done: true });
      },
    );
  });

  it("creates and patches tabs at the right method + path", async () => {
    await withClient(
      (req) => (req.method === "PUT" ? { json: { tab_id: "tab_1" } } : { json: { ok: true } }),
      async (client, requests) => {
        const created = await client.createTab({ title: "Notes" });
        expect(created.tab_id).toBe("tab_1");
        const patched = await client.patchTab("tab_1", { status: "archived" });
        expect(patched.ok).toBe(true);
        expect(requests()[0]!).toMatchObject({ method: "PUT", path: "/agent/tabs" });
        expect(requests()[1]!).toMatchObject({ method: "PATCH", path: "/agent/tabs/tab_1" });
      },
    );
  });

  it("reads attachment bytes and content headers", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await withClient(
      () => ({
        body: bytes,
        headers: {
          "content-type": "application/octet-stream",
          "content-disposition": "attachment; filename=x.bin",
        },
      }),
      async (client, requests) => {
        const att = await client.getAttachment("file_1");
        expect(Array.from(att.bytes)).toEqual([1, 2, 3, 4]);
        expect(att.content_type).toBe("application/octet-stream");
        expect(att.content_disposition).toContain("attachment");
        expect(requests()[0]!.path).toBe("/agent/attachments/file_1");
      },
    );
  });
});

describe("HermesCanvasClient — error handling", () => {
  it("maps a 401 body to ConnectorHttpError with the contract code", async () => {
    await withClient(
      () => ({ status: 401, json: errorBody("unauthorized", "missing or invalid service token") }),
      async (client) => {
        await expect(client.listArtifacts()).rejects.toMatchObject({
          name: "ConnectorHttpError",
          status: 401,
          code: "unauthorized",
        });
      },
    );
  });

  it("surfaces oversize detail on a 413", async () => {
    const detail = {
      limit: "VERSION_CONTENT_BYTES",
      limit_value: 262144,
      actual: 300000,
      unit: "bytes",
    };
    await withClient(
      () => ({
        status: 413,
        json: errorBody("oversize", "content exceeds VERSION_CONTENT_BYTES", detail),
      }),
      async (client) => {
        await client
          .createArtifact({ type: "markdown", title: "Big", content: "x", why: "w" })
          .then(
            () => {
              throw new Error("expected rejection");
            },
            (err: unknown) => {
              expect(err).toBeInstanceOf(ConnectorHttpError);
              const httpErr = err as ConnectorHttpError;
              expect(httpErr.status).toBe(413);
              expect(httpErr.code).toBe("oversize");
              expect(httpErr.apiError?.detail).toMatchObject(detail);
            },
          );
      },
    );
  });

  it("carries a non-contract code (e.g. 501 not_implemented) as a plain string", async () => {
    await withClient(
      () => ({
        status: 501,
        json: errorBody("not_implemented", "attachment serving is provided by files*"),
      }),
      async (client) => {
        await client.getAttachment("file_1").then(
          () => {
            throw new Error("expected rejection");
          },
          (err: unknown) => {
            expect(err).toBeInstanceOf(ConnectorHttpError);
            const httpErr = err as ConnectorHttpError;
            expect(httpErr.status).toBe(501);
            expect(httpErr.code).toBe("not_implemented");
            expect(httpErr.apiError).toBeUndefined(); // not a frozen ErrorCode
          },
        );
      },
    );
  });

  it("raises ConnectorResponseError when a 2xx body violates the contract", async () => {
    await withClient(
      () => ({ json: { cursor: -1, messages: [], events: [] } }), // cursor must be nonnegative
      async (client) => {
        await expect(client.getUpdates(0)).rejects.toBeInstanceOf(ConnectorResponseError);
      },
    );
  });

  it("raises ConnectorNetworkError when no response is produced", async () => {
    // Point at a closed port: server started then immediately closed.
    const server = await startMockServer(() => ({ json: {} }));
    const url = server.url;
    await server.close();
    const client = new HermesCanvasClient({ baseUrl: url, serviceToken: TOKEN, timeoutMs: 500 });
    await expect(client.listArtifacts()).rejects.toBeInstanceOf(ConnectorNetworkError);
  });
});
