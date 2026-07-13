import { describe, expect, it, vi } from "vitest";
import { createMockChatBackend } from "./mockBackend";
import type { ChatMessage, ChatSnapshot } from "./types";

/** Grab the latest human/agent message from a snapshot. */
function lastMessage(snap: ChatSnapshot): ChatMessage | undefined {
  for (let i = snap.items.length - 1; i >= 0; i--) {
    const item = snap.items[i];
    if (item?.kind === "message") return item.message;
  }
  return undefined;
}

describe("createMockChatBackend (deterministic driver mode)", () => {
  it("delivers the current snapshot immediately on subscribe", () => {
    const backend = createMockChatBackend({ auto: false, initialConnection: "connecting" });
    const seen: ChatSnapshot[] = [];
    backend.subscribe((s) => seen.push(s));
    expect(seen).toHaveLength(1);
    expect(seen[0]?.connection).toBe("connecting");
    expect(seen[0]?.items).toEqual([]);
  });

  it("optimistically shows an outgoing message as sending, then acks to complete", async () => {
    const backend = createMockChatBackend({ auto: false });
    let latest: ChatSnapshot = backend.snapshot();
    backend.subscribe((s) => (latest = s));

    await backend.send({ text: "hello", attachmentIds: [] });
    const sending = lastMessage(latest);
    expect(sending?.role).toBe("human");
    expect(sending?.status).toBe("sending");
    expect(sending?.body).toBe("hello");

    backend.ackSend(sending!.id);
    expect(lastMessage(latest)?.status).toBe("complete");
  });

  it("marks a failed send as error and lets retry re-send it", async () => {
    const backend = createMockChatBackend({ auto: false });
    let latest: ChatSnapshot = backend.snapshot();
    backend.subscribe((s) => (latest = s));

    await backend.send({ text: "oops", attachmentIds: [] });
    const id = lastMessage(latest)!.id;
    backend.failSend(id, "network down");
    expect(lastMessage(latest)?.status).toBe("error");

    await backend.retry(id);
    expect(lastMessage(latest)?.status).toBe("sending");
  });

  it("streams an agent reply as coalesced deltas", () => {
    const backend = createMockChatBackend({ auto: false });
    let latest: ChatSnapshot = backend.snapshot();
    backend.subscribe((s) => (latest = s));

    const stream = backend.streamAgent();
    expect(lastMessage(latest)?.status).toBe("streaming");
    stream.delta("Hel");
    stream.delta("lo");
    expect(lastMessage(latest)?.body).toBe("Hello");
    stream.done();
    expect(lastMessage(latest)?.status).toBe("complete");
  });

  it("appends a system-event row from a feed event", () => {
    const backend = createMockChatBackend({ auto: false });
    let latest: ChatSnapshot = backend.snapshot();
    backend.subscribe((s) => (latest = s));

    backend.pushEvent({
      seq: 7,
      kind: "artifact_updated",
      actor: "agent",
      refs: { artifact_id: "art_2", version_seq: 4 },
      at: 1,
    });
    const row = latest.items.at(-1);
    expect(row?.kind).toBe("system");
    if (row?.kind === "system") expect(row.event.summary).toContain("art_2");
  });

  it("reports upload progress and resolves the handle", async () => {
    const backend = createMockChatBackend({ auto: false });
    const onProgress = vi.fn();
    const handle = backend.upload({ name: "a.png", size: 10, type: "image/png" }, { onProgress });

    backend.progressUpload(handle.id, 0.5);
    expect(onProgress).toHaveBeenLastCalledWith(0.5);

    backend.resolveUpload(handle.id);
    await expect(handle.done).resolves.toEqual({ id: handle.id });
  });

  it("rejects the upload handle when the upload fails", async () => {
    const backend = createMockChatBackend({ auto: false });
    const handle = backend.upload({ name: "a.bin", size: 10, type: "x" });
    backend.failUpload(handle.id, "boom");
    await expect(handle.done).rejects.toThrow("boom");
  });

  it("drives the connection state for the reconnect banner", () => {
    const backend = createMockChatBackend({ auto: false });
    let latest: ChatSnapshot = backend.snapshot();
    backend.subscribe((s) => (latest = s));
    backend.setConnection("reconnecting");
    expect(latest.connection).toBe("reconnecting");
  });
});
