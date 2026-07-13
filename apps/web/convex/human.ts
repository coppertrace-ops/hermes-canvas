import { byteLength, CanvasError, LIMITS } from "@hermes/contract";
import { v } from "convex/values";
import { requireOwner } from "./authGuard";
import { mutation } from "./_generated/server";
import { reject } from "./lib/outcome";
import { appendEvent } from "./lib/store";

/**
 * Human-facing chat surface (OWNER: LEDGER, plan §2 / §6).
 *
 * `agentWrites.postMessage` is an `internalMutation` — it is the AGENT's write
 * path, reached only through the service-token `/agent/*` HTTP actions. The
 * browser has no way to post a human message through it. This file closes that
 * gap with the ONE public mutation the authenticated human UI needs: it appends a
 * human message and its `message` event to the same append-only ledger, so the
 * existing agent loop (which polls `canvas.pendingWork` for `role === "human"`
 * messages) picks it up and replies through its own write path.
 *
 * It deliberately does NOT synthesize an assistant reply — a human send creates a
 * pending user turn, nothing more. Listing the resulting thread is the existing
 * public `canvas.getUpdates` live query; there is no second read path to keep in
 * sync.
 *
 * AUTH: this is a browser-only mutation (it is NOT wired into the `/agent/*` HTTP
 * router — the agent posts through `internal.agentWrites.postMessage` instead), so
 * it requires the signed-in owner. `requireOwner` enforces the plan §6 owner
 * identity across the non-`/agent/*` surface; the demo bypass is honored only in
 * non-production. A non-owner or anonymous caller is rejected before any write.
 */
export const sendMessage = mutation({
  args: { text: v.string(), turn_id: v.optional(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { ok: true; message_id: string }
    | { ok: false; error: ReturnType<typeof CanvasError.oversize>["error"] }
  > => {
    await requireOwner(ctx);
    const now = Date.now();

    if (byteLength(args.text) > LIMITS.MESSAGE_BYTES) {
      // A blocked send is recorded evidence (`limit_rejected` event), never a
      // silent drop — the same rule the agent write path uses.
      const out = await reject(
        ctx,
        CanvasError.oversize({
          limit: "MESSAGE_BYTES",
          limit_value: LIMITS.MESSAGE_BYTES,
          actual: byteLength(args.text),
          unit: "bytes",
        }),
        "human",
        {},
        now,
      );
      return out as { ok: false; error: ReturnType<typeof CanvasError.oversize>["error"] };
    }

    const seq = await appendEvent(ctx, { kind: "message", actor: "human", refs: {}, at: now });
    const id = await ctx.db.insert("messages", {
      role: "human",
      body: args.text,
      status: "complete",
      turn_id: args.turn_id,
      event_seq: seq,
      at: now,
    });
    return { ok: true, message_id: id };
  },
});
