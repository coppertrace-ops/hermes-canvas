import { FLAG_KEYS, flagsAllOff, isFlagKey } from "@hermes/contract";
import type { FlagState } from "@hermes/contract";
import { v } from "convex/values";
import { requireOwner } from "./authGuard";
import { appendEvent } from "./lib/store";
import { mutation, query } from "./_generated/server";

/**
 * Server-side feature-flag subsystem (Wave 2, spec §1; OWNER: LEDGER).
 *
 * Flags are the rollback mechanism for the flagged Wave 2 surfaces (`html_artifacts`,
 * `boards`, `jobs_tab`): flipping one off is a seconds-fast, no-deploy containment
 * step. They are evaluated SERVER-SIDE in Convex; the browser subscribes to
 * `getFlags` as a live query so a prod flip takes effect without a redeploy, and a
 * flagged-off surface renders its honest disabled state (never a blank, never a
 * client-only hide).
 *
 * INVARIANTS (spec §1):
 *  - Default OFF: an absent row reads as `false`; `getFlags` fills every key.
 *  - Owner-only flips: `setFlag` is `requireOwner`-gated. The `/agent/*` service
 *    path can NOT reach this module (it is not an internal function, and the agent
 *    layer never calls it) — flags are a human/launch decision, not agent-writable.
 *  - Closed key set: an unknown key is rejected, never stored.
 *  - Atomic audit: the row upsert and the `flag_changed` event are one mutation, so
 *    the audit trail can never disagree with the flag's current state.
 *  - Flags gate RENDERING of risky surfaces, not data ingestion. Nothing here
 *    refuses an agent write; artifacts written while a flag was on stay stored and
 *    re-render when the flag returns (spec §1, §9).
 */

/**
 * Public live query: the full boolean state of every flag. Single-owner
 * deployment, and this exposes only booleans (no secrets), so it is intentionally
 * un-guarded — the UI must be able to read flag state to render disabled surfaces
 * even before/without an owner session. Absent rows default to OFF.
 */
export const getFlags = query({
  args: {},
  handler: async (ctx): Promise<FlagState> => {
    const state = flagsAllOff();
    for (const key of FLAG_KEYS) {
      const row = await ctx.db
        .query("flags")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (row) state[key] = row.enabled;
    }
    return state;
  },
});

/**
 * Owner-only flip. Validates `key` against the closed set, upserts the `flags`
 * row, and writes a `flag_changed` audit event in the SAME mutation.
 */
export const setFlag = mutation({
  args: { key: v.string(), enabled: v.boolean() },
  handler: async (ctx, { key, enabled }): Promise<{ key: string; enabled: boolean }> => {
    await requireOwner(ctx);
    if (!isFlagKey(key)) {
      throw new Error(`unknown flag key: ${key}`);
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("flags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { enabled, updated_at: now });
    } else {
      await ctx.db.insert("flags", { key, enabled, updated_at: now });
    }

    // Same-mutation audit event (transactional with the upsert above).
    await appendEvent(ctx, {
      kind: "flag_changed",
      actor: "human",
      refs: { flag_key: key, enabled },
      at: now,
    });

    return { key, enabled };
  },
});
