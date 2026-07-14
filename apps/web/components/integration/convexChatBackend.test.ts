import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConvexReactClient } from "convex/react";
import { getFunctionName } from "convex/server";
import { describeSystemEvent } from "../chat";
import type { ChatSnapshot } from "../chat";
import {
  bindErrorMessage,
  buildDownloadRequest,
  createConvexChatBackend,
  mapConnection,
} from "./convexChatBackend";

const EMPTY_PAGE = {
  messages: [] as unknown[],
  has_more: false,
  oldest_event_seq: null,
  newest_event_seq: null,
  cursor: 0,
};

/**
 * A minimal fake of the ConvexReactClient surface the chat backend touches:
 * a live `watchQuery`, a controllable `mutation`, and the connection-state hooks.
 */
function makeFakeClient(liveEvents: unknown[] = []) {
  let conn = { isWebSocketConnected: false, hasEverConnected: false };
  let connCb: ((cs: typeof conn) => void) | null = null;
  const mutationCalls: Array<{ text: string; turn_id?: string }> = [];
  const controllers: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

  // The backend creates the messages watch first, then the events watch — so the
  // first watchQuery call is listRecentMessages (a page), the rest listRecentEvents.
  let watchCount = 0;
  const client = {
    watchQuery: () => {
      const isEvents = watchCount++ > 0;
      return {
        localQueryResult: () => (isEvents ? liveEvents : EMPTY_PAGE),
        onUpdate: () => () => {},
      };
    },
    query: vi.fn(async () => EMPTY_PAGE),
    mutation: (_ref: unknown, args: { text: string; turn_id?: string }) => {
      mutationCalls.push(args);
      return new Promise((resolve, reject) => controllers.push({ resolve, reject }));
    },
    connectionState: () => conn,
    subscribeToConnectionState: (cb: (cs: typeof conn) => void) => {
      connCb = cb;
      return () => {};
    },
  };

  return {
    client: client as unknown as ConvexReactClient,
    mutationCalls,
    rejectLast: (e: unknown) => controllers[controllers.length - 1]?.reject(e),
    resolveLast: (v: unknown) => controllers[controllers.length - 1]?.resolve(v),
    setConn: (cs: { isWebSocketConnected: boolean; hasEverConnected: boolean }) => {
      conn = cs;
      connCb?.(cs);
    },
  };
}

/** Flush pending microtasks so a rejected mutation's .catch runs. */
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe("createConvexChatBackend — idempotent turn_id", () => {
  it("sends a stable client turn_id on the mutation", () => {
    const f = makeFakeClient();
    const backend = createConvexChatBackend(f.client);
    void backend.send({ text: "hi", attachmentIds: [] });
    expect(f.mutationCalls).toHaveLength(1);
    expect(typeof f.mutationCalls[0]?.turn_id).toBe("string");
    expect(f.mutationCalls[0]!.turn_id!.length).toBeGreaterThan(0);
  });

  it("reuses the same turn_id when an ambiguous failure is retried", async () => {
    const f = makeFakeClient();
    const backend = createConvexChatBackend(f.client);
    let snap: ChatSnapshot | undefined;
    backend.subscribe((s) => (snap = s));

    void backend.send({ text: "hi", attachmentIds: [] });
    f.rejectLast(new Error("network dropped mid-flight"));
    await flush();

    const errored = snap?.items.find((i) => i.kind === "message" && i.message.status === "error");
    expect(errored?.kind).toBe("message");
    const id = errored && errored.kind === "message" ? errored.message.id : "";

    void backend.retry(id);
    expect(f.mutationCalls).toHaveLength(2);
    // The whole point: an ambiguous first attempt + retry share one idempotency key,
    // so a server that already committed the first can dedupe the second.
    expect(f.mutationCalls[1]?.turn_id).toBe(f.mutationCalls[0]?.turn_id);
  });
});

describe("createConvexChatBackend — connection banner wiring", () => {
  it("maps the live transport onto the UI connection state", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const f = makeFakeClient();
    let snap: ChatSnapshot | undefined;
    const backend = createConvexChatBackend(f.client);
    backend.subscribe((s) => (snap = s));

    expect(snap?.connection).toBe("connecting"); // never connected yet
    f.setConn({ isWebSocketConnected: true, hasEverConnected: true });
    expect(snap?.connection).toBe("live");
    f.setConn({ isWebSocketConnected: false, hasEverConnected: true });
    expect(snap?.connection).toBe("reconnecting");
  });
});

describe("createConvexChatBackend — system-event adapter seam", () => {
  it("renders injected recent system events as timeline rows (override)", () => {
    const f = makeFakeClient();
    const event = describeSystemEvent({
      seq: 5,
      kind: "artifact_updated",
      actor: "agent",
      refs: { artifact_id: "art_9", version_seq: 3 },
      at: 1,
    });
    const backend = createConvexChatBackend(f.client, { systemEvents: () => [event] });
    let snap: ChatSnapshot | undefined;
    backend.subscribe((s) => (snap = s));

    const sys = snap?.items.find((i) => i.kind === "system");
    expect(sys?.kind).toBe("system");
    if (sys?.kind === "system") expect(sys.event.summary).toContain("art_9");
  });

  it("maps the live listRecentEvents feed into system rows, dropping message-kind events", () => {
    // A message-kind event must NOT become a system line (it renders as a bubble);
    // an artifact event must.
    const f = makeFakeClient([
      { seq: 1, kind: "message", actor: "human", refs: {}, at: 1 },
      { seq: 2, kind: "artifact_created", actor: "agent", refs: { artifact_id: "art_7" }, at: 2 },
    ]);
    const backend = createConvexChatBackend(f.client);
    let snap: ChatSnapshot | undefined;
    backend.subscribe((s) => (snap = s));

    const sysRows = snap?.items.filter((i) => i.kind === "system") ?? [];
    expect(sysRows).toHaveLength(1);
    if (sysRows[0]?.kind === "system") expect(sysRows[0].event.summary).toContain("art_7");
  });
});

// A live page carrying seeded messages (first watchQuery = messages, rest = events).
function makeFeedClient(messages: unknown[]) {
  const page = {
    messages,
    has_more: false,
    oldest_event_seq: null,
    newest_event_seq: null,
    cursor: 0,
  };
  let watchCount = 0;
  const sendCalls: Array<Record<string, unknown>> = [];
  const bindCalls: Array<Record<string, unknown>> = [];
  const client = {
    watchQuery: () => {
      const isEvents = watchCount++ > 0;
      return {
        localQueryResult: () => (isEvents ? [] : page),
        onUpdate: () => () => {},
      };
    },
    query: vi.fn(async () => ({ ...page, messages: [] })),
    mutation: vi.fn(async (ref: unknown, args: Record<string, unknown>) => {
      // The generated `anyApi` proxy is not identity-stable across accesses, so
      // route by the stable function name, not by reference equality.
      const name = getFunctionName(ref as never);
      if (name === "files:generateUploadUrl") return "https://upload.example/one-shot";
      if (name === "files:bindAttachment") {
        bindCalls.push(args);
        return { ok: true, attachment_id: "att_srv_1", sha256: "deadbeef", size: 1234 };
      }
      if (name === "human:sendMessage") {
        sendCalls.push(args);
        return { ok: true, message_id: "srv_msg_1" };
      }
      return undefined;
    }),
    connectionState: () => ({ isWebSocketConnected: true, hasEverConnected: true }),
    subscribeToConnectionState: () => () => {},
  };
  return { client: client as unknown as ConvexReactClient, sendCalls, bindCalls };
}

describe("createConvexChatBackend — attachment upload flow", () => {
  it("uploads bytes with progress, binds, and resolves the server attachment id", async () => {
    const { client, bindCalls } = makeFeedClient([]);
    const progress: number[] = [];
    const putBytes = vi.fn(async (_url: string, _blob: Blob, o: { onProgress?: (f: number) => void }) => {
      o.onProgress?.(0.5);
      o.onProgress?.(1);
      return "storage_9";
    });
    const backend = createConvexChatBackend(client, {
      systemEvents: () => [],
      putBytes,
      attachmentMeta: async () => [],
    });

    const file = new File(["hello world"], "note.txt", { type: "text/plain" });
    const handle = backend.upload(file, { onProgress: (f) => progress.push(f) });
    const ready = await handle.done;

    expect(ready.id).toBe("att_srv_1");
    expect(progress).toEqual([0.5, 1]);
    expect(putBytes).toHaveBeenCalledOnce();
    // The bind carries the storage id from the PUT plus the file's name + mime.
    expect(bindCalls[0]).toMatchObject({ storage_id: "storage_9", name: "note.txt", mime: "text/plain" });
  });

  it("rejects an oversize bind with the 10 MB limit named", async () => {
    const { client } = makeFeedClient([]);
    // Override bindAttachment to return the server's structured oversize refusal.
    (client.mutation as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (ref: unknown) => {
        const name = getFunctionName(ref as never);
        if (name === "files:generateUploadUrl") return "https://upload.example/one-shot";
        if (name === "files:bindAttachment") {
          return { ok: false, error: { code: "oversize", message: "server", detail: { limit_value: 10 * 1024 * 1024 } } };
        }
        return undefined;
      },
    );
    const backend = createConvexChatBackend(client, {
      systemEvents: () => [],
      putBytes: async () => "storage_x",
      attachmentMeta: async () => [],
    });
    const file = new File(["x"], "huge.bin", { type: "" });
    await expect(backend.upload(file).done).rejects.toThrow(/10 MB limit/);
  });

  it("passes bound attachment ids through on send", async () => {
    const { client, sendCalls } = makeFeedClient([]);
    const backend = createConvexChatBackend(client, { systemEvents: () => [], attachmentMeta: async () => [] });
    await backend.send({ text: "see attached", attachmentIds: ["att_srv_1"] });
    await flush();
    expect(sendCalls[0]).toMatchObject({ text: "see attached", attachments: ["att_srv_1"] });
  });

  it("resolves received-attachment metadata into name + size chips", async () => {
    const client = makeFeedClient([
      { message_id: "m1", role: "human", body: "here", status: "complete", at: 1, attachments: ["att_srv_9"] },
    ]).client;
    const meta = vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, name: "report.pdf", mime: "application/pdf", size: 2048 })),
    );
    const backend = createConvexChatBackend(client, { systemEvents: () => [], attachmentMeta: meta });
    let snap: ChatSnapshot | undefined;
    backend.subscribe((s) => (snap = s));

    expect(meta).toHaveBeenCalledWith(["att_srv_9"]);
    await flush();
    const msg = snap?.items.find((i) => i.kind === "message");
    const att = msg?.kind === "message" ? msg.message.attachments[0] : undefined;
    expect(att).toMatchObject({ id: "att_srv_9", name: "report.pdf", size: 2048, status: "ready" });
  });

  it("exposes downloadAttachment only when an endpoint is configured", () => {
    const noEndpoint = createConvexChatBackend(makeFeedClient([]).client, { systemEvents: () => [] });
    expect(noEndpoint.downloadAttachment).toBeUndefined();
    const withEndpoint = createConvexChatBackend(makeFeedClient([]).client, {
      systemEvents: () => [],
      attachmentEndpoint: { baseUrl: "https://x.convex.site", getToken: () => "tok" },
    });
    expect(typeof withEndpoint.downloadAttachment).toBe("function");
  });

  it("reuses the same attachment ids across an ambiguous retry", async () => {
    const f = makeFakeClient();
    const backend = createConvexChatBackend(f.client, { attachmentMeta: async () => [] });
    let snap: ChatSnapshot | undefined;
    backend.subscribe((s) => (snap = s));

    void backend.send({ text: "with file", attachmentIds: ["att_9"] });
    f.rejectLast(new Error("dropped mid-flight"));
    await flush();

    const errored = snap?.items.find((i) => i.kind === "message" && i.message.status === "error");
    const id = errored && errored.kind === "message" ? errored.message.id : "";
    void backend.retry(id);

    expect(f.mutationCalls).toHaveLength(2);
    expect((f.mutationCalls[0] as { attachments?: string[] }).attachments).toEqual(["att_9"]);
    expect((f.mutationCalls[1] as { attachments?: string[] }).attachments).toEqual(["att_9"]);
  });
});

describe("buildDownloadRequest", () => {
  it("attaches a bearer token when present and normalizes the base", () => {
    expect(buildDownloadRequest("https://x.convex.site/", "att_1", "tok")).toEqual({
      url: "https://x.convex.site/attachments/att_1",
      headers: { Authorization: "Bearer tok" },
    });
  });
  it("omits the auth header when there is no token", () => {
    expect(buildDownloadRequest("https://x.convex.site", "att_1", null).headers).toEqual({});
  });
  it("url-encodes the attachment id", () => {
    expect(buildDownloadRequest("https://x.convex.site", "a/b", null).url).toBe(
      "https://x.convex.site/attachments/a%2Fb",
    );
  });
});

describe("bindErrorMessage", () => {
  it("names the limit on an oversize refusal", () => {
    const msg = bindErrorMessage("huge.bin", {
      code: "oversize",
      message: "server text",
      detail: { limit_value: 10 * 1024 * 1024 },
    });
    expect(msg).toContain("10 MB");
    expect(msg).toContain("huge.bin");
  });
  it("explains an expired upload on not_found", () => {
    expect(bindErrorMessage("f", { code: "not_found", message: "x" })).toMatch(/expired/i);
  });
  it("falls back to the server message otherwise", () => {
    expect(bindErrorMessage("f", { code: "validation_failed", message: "bad id" })).toBe("bad id");
  });
});

describe("mapConnection", () => {
  it("socket up → live", () => {
    expect(mapConnection({ isWebSocketConnected: true, hasEverConnected: true })).toBe("live");
  });
  it("never connected → connecting", () => {
    expect(mapConnection({ isWebSocketConnected: false, hasEverConnected: false })).toBe("connecting");
  });
  it("dropped while online → reconnecting", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(mapConnection({ isWebSocketConnected: false, hasEverConnected: true })).toBe("reconnecting");
  });
  it("dropped while offline → offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(mapConnection({ isWebSocketConnected: false, hasEverConnected: true })).toBe("offline");
  });
});
