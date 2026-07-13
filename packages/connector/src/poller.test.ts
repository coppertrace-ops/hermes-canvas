import { describe, expect, it } from "vitest";
import { HermesCanvasClient } from "./client";
import { UpdatesPoller, type UpdatesBatch } from "./poller";
import { startMockServer } from "./testing/mockServer";

const TOKEN = "poll-token-0123456789abcdef0123456789abcdef0123456789abcdef012345";

/** A minimal server-side feed keyed by a monotonic global seq. */
function makeFeed() {
  const events: {
    seq: number;
    kind: string;
    actor: string;
    refs: Record<string, unknown>;
    at: number;
  }[] = [];
  let seq = 0;
  return {
    push() {
      seq += 1;
      events.push({
        seq,
        kind: "artifact_updated",
        actor: "human",
        refs: { artifact_id: "a" },
        at: 1000 + seq,
      });
    },
    since(cursor: number) {
      const slice = events.filter((e) => e.seq > cursor);
      return { cursor: seq, messages: [], events: slice };
    },
  };
}

async function withPollServer(
  feed: ReturnType<typeof makeFeed>,
  body: (client: HermesCanvasClient, requests: () => { query: URLSearchParams }[]) => Promise<void>,
): Promise<void> {
  const server = await startMockServer((req) => ({
    json: feed.since(Number(req.query.get("cursor") ?? 0)),
  }));
  try {
    const client = new HermesCanvasClient({ baseUrl: server.url, serviceToken: TOKEN });
    await body(client, () => server.requests);
  } finally {
    await server.close();
  }
}

describe("UpdatesPoller — cursor tracking", () => {
  it("advances the cursor and never re-delivers events across polls", async () => {
    const feed = makeFeed();
    const batches: UpdatesBatch[] = [];
    await withPollServer(feed, async (client, requests) => {
      const poller = new UpdatesPoller(client, { onBatch: (b) => void batches.push(b) });

      feed.push(); // seq 1
      feed.push(); // seq 2
      await poller.pollOnce();
      expect(poller.currentCursor).toBe(2);
      expect(batches).toHaveLength(1);
      expect(batches[0]!.events.map((e) => e.seq)).toEqual([1, 2]);

      feed.push(); // seq 3
      await poller.pollOnce();
      expect(poller.currentCursor).toBe(3);
      expect(batches).toHaveLength(2);
      expect(batches[1]!.events.map((e) => e.seq)).toEqual([3]); // no re-delivery

      // Second poll sent cursor=2 (the value after the first batch).
      expect(requests()[1]!.query.get("cursor")).toBe("2");
    });
  });

  it("does not invoke onBatch on an empty poll", async () => {
    const feed = makeFeed();
    let calls = 0;
    await withPollServer(feed, async (client) => {
      const poller = new UpdatesPoller(client, { onBatch: () => void (calls += 1) });
      await poller.pollOnce();
      expect(calls).toBe(0);
      expect(poller.currentCursor).toBe(0);
    });
  });
});

describe("UpdatesPoller — self-driving loop", () => {
  it("polls on the injected timer until stopped", async () => {
    const feed = makeFeed();
    const batches: UpdatesBatch[] = [];
    await withPollServer(feed, async (client) => {
      let ticks = 0;
      const poller = new UpdatesPoller(client, {
        intervalMs: 1,
        onBatch: (b) => void batches.push(b),
        // Deterministic timer: stop the loop after a few sleeps.
        sleep: async () => {
          ticks += 1;
          if (ticks === 1) feed.push();
          if (ticks >= 3) poller.stop();
        },
      });
      await poller.start();
      expect(poller.isRunning).toBe(false);
      expect(batches).toHaveLength(1);
      expect(ticks).toBe(3);
    });
  });

  it("routes loop errors to onError and stops when it returns false", async () => {
    // A fake client whose getUpdates always throws, to drive the error path.
    const failing = {
      getUpdates: () => Promise.reject(new Error("transient")),
    } as unknown as HermesCanvasClient;

    const errors: unknown[] = [];
    const poller = new UpdatesPoller(failing, {
      onBatch: () => {},
      sleep: async () => {},
      onError: (e) => {
        errors.push(e);
        return errors.length < 3; // keep going twice, then stop
      },
    });
    await poller.start();
    expect(poller.isRunning).toBe(false);
    expect(errors).toHaveLength(3);
    expect(poller.currentCursor).toBe(0); // never advanced through failures
  });

  it("leaves the cursor untouched when a poll throws", async () => {
    const server = await startMockServer(() => ({
      status: 500,
      json: { error: { code: "boom", message: "x" } },
    }));
    try {
      const client = new HermesCanvasClient({ baseUrl: server.url, serviceToken: TOKEN });
      const poller = new UpdatesPoller(client, { cursor: 5, onBatch: () => {} });
      await expect(poller.pollOnce()).rejects.toBeTruthy();
      expect(poller.currentCursor).toBe(5);
    } finally {
      await server.close();
    }
  });
});
