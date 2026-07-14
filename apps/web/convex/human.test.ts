/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import schema from "./schema";

/**
 * Human chat surface tests (OWNER: PROOF, closing the live-bridge gap).
 *
 * Prove the two behaviours the browser send path depends on:
 *  1. `human.sendMessage` PERSISTS a human message + its `message` event in the
 *     append-only ledger (no fabricated assistant reply).
 *  2. That message is VISIBLE as pending work — `canvas.pendingWork` surfaces the
 *     human turn (and only human turns) so the existing agent loop can consume it.
 *
 * `sendMessage` is now owner-guarded (WARDEN authz pass), so these browser-path
 * assertions run as the signed-in owner via `t.withIdentity`. The authorization
 * boundary itself (anonymous rejects, owner succeeds, agent internal path stays
 * open) is proven separately in `authz.test.ts`.
 *
 * Runs the real Convex functions against an in-memory backend via `convex-test`.
 */

const modules = import.meta.glob("./**/!(*.test).*s");

/** The signed-in owner; Convex Auth's allowlist-of-one means any identity IS the owner. */
const OWNER = { subject: "owner|1", issuer: "https://example.com", email: "owner@example.com" };

describe("human.sendMessage", () => {
  it("persists a human message and a message event (no assistant reply)", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);

    const res = await t.mutation(api.human.sendMessage, { text: "Please tidy the notes." });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(typeof res.message_id).toBe("string");

    const { messages, events } = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      events: await ctx.db.query("events").collect(),
    }));

    // Exactly one message, and it is the human's — no fake agent response.
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe("human");
    expect(messages[0]!.body).toBe("Please tidy the notes.");
    expect(messages[0]!.status).toBe("complete");

    // A single `message` event by the human actor drives the feed cursor.
    const messageEvents = events.filter((e) => e.kind === "message");
    expect(messageEvents).toHaveLength(1);
    expect(messageEvents[0]!.actor).toBe("human");
  });

  it("rejects an oversize message as recorded evidence, not a silent drop", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const huge = "x".repeat(200_000); // exceeds MESSAGE_BYTES

    const res = await t.mutation(api.human.sendMessage, { text: huge });
    expect(res.ok).toBe(false);

    const { messages, events } = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      events: await ctx.db.query("events").collect(),
    }));
    // The message was not stored, but the rejection is on the ledger.
    expect(messages).toHaveLength(0);
    expect(events.some((e) => e.kind === "limit_rejected")).toBe(true);
  });
});

describe("pending work visibility", () => {
  it("surfaces the human turn (and only human turns) for the agent loop", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);

    await t.mutation(api.human.sendMessage, { text: "Human asks a question." });
    // An agent reply lands through the agent-only internal path.
    await t.mutation(internal.agentWrites.postMessage, {
      text: "Agent replies.",
      role: "agent",
    });

    const pending = await t.query(internal.canvas.pendingWork, { cursor: 0 });
    expect(pending.messages).toHaveLength(1);
    expect(pending.messages[0]!.role).toBe("human");
    expect(pending.messages[0]!.body).toBe("Human asks a question.");

    // The full transcript still contains both messages — pendingWork only filters.
    const recent = await t.query(api.canvas.listRecentMessages, {});
    expect(recent.messages).toHaveLength(2);
  });
});

describe("sendMessage attachments", () => {
  /**
   * Seed a bound attachment row directly on the given backend (`bindAttachment`
   * needs a real uploaded blob, which convex-test storage doesn't mint here).
   */
  function seedAttachment(
    t: { run: <T>(fn: (ctx: MutationCtx) => Promise<T>) => Promise<T> },
    uploadedBy: "human" | "agent" = "human",
  ): Promise<string> {
    return t.run((ctx) =>
      ctx.db.insert("attachments", {
        file_id: "kg_fake_storage_id",
        name: "diagram.png",
        mime: "image/png",
        size: 1234,
        sha256: "abc123",
        uploaded_by: uploadedBy,
        at: Date.now(),
      }),
    );
  }

  it("binds a valid owner attachment and the transcript returns it", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const attachmentId = await seedAttachment(t);

    const res = await t.mutation(api.human.sendMessage, {
      text: "see attached",
      attachments: [attachmentId],
    });
    expect(res.ok).toBe(true);

    const stored = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(stored).toHaveLength(1);
    expect(stored[0]!.attachments).toEqual([attachmentId]);

    // The read path the UI subscribes to surfaces the attachment ids.
    const recent = await t.query(api.canvas.listRecentMessages, {});
    expect(recent.messages).toHaveLength(1);
    expect(recent.messages[0]!.attachments).toEqual([attachmentId]);
  });

  it("rejects an unknown attachment id and writes no message", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const res = await t.mutation(api.human.sendMessage, {
      text: "bad ref",
      attachments: ["att_does_not_exist"],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("validation_failed");

    const stored = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(stored).toHaveLength(0);
  });

  it("rejects an agent-owned attachment on the human send path", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const agentAttachment = await seedAttachment(t, "agent");
    const res = await t.mutation(api.human.sendMessage, {
      text: "not mine",
      attachments: [agentAttachment],
    });
    expect(res.ok).toBe(false);
    const stored = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(stored).toHaveLength(0);
  });

  it("leaves text-only sends unchanged (no attachments field)", async () => {
    const t = convexTest(schema, modules).withIdentity(OWNER);
    const res = await t.mutation(api.human.sendMessage, { text: "plain" });
    expect(res.ok).toBe(true);
    const stored = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(stored[0]!.attachments).toBeUndefined();
  });
});
