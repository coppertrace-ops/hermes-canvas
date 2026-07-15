import { LIMITS } from "@hermes/contract";
import type { Limits } from "@hermes/contract";
import { v } from "convex/values";
import { requireOwner } from "./authGuard";
import { query } from "./_generated/server";

/**
 * Settings read surface (OWNER: LEDGER read seam).
 *
 * Owner-guarded live queries the Settings panel subscribes to. The matching
 * writes arrive on the service-token `/agent/*` path (`agentInfra.ts`), so — like
 * `jobs.ts` — this module is a pure reader: the agent path never reaches these
 * queries, and the browser never reaches the internal write mutations.
 *
 * All three queries are `requireOwner`-gated: the identity-less `/agent/*` path
 * has no user identity, so it cannot read here (it wouldn't need to — it is the
 * writer).
 */

export interface AgentStatusDto {
  model: string;
  provider: string;
  effort?: string;
  fallbacks?: string[];
  context?: { used_tokens?: number; max_tokens?: number };
  gateway?: { version?: string; uptime_s?: number };
  toolsets?: string[];
  platforms?: string[];
  sessions_active?: number;
  memory?: { provider?: string; recall_budget?: number };
  reported_at: number;
}

export interface MemoryDto {
  entry_id: string;
  content: string;
  tags?: string[];
  source?: string;
  created_at?: number;
  updated_at?: number;
  synced_at: number;
}

export interface WorkspaceInfoDto {
  limits: Limits;
  deployment: { convex_url: string | null };
  app_version?: string;
}

/** The gateway's last-reported status, or null if it has never reported. */
export const getAgentStatus = query({
  args: {},
  handler: async (ctx): Promise<AgentStatusDto | null> => {
    await requireOwner(ctx);
    const row = await ctx.db.query("agent_status").first();
    if (!row) return null;
    return {
      model: row.model,
      provider: row.provider,
      effort: row.effort,
      fallbacks: row.fallbacks,
      context: row.context,
      gateway: row.gateway,
      toolsets: row.toolsets,
      platforms: row.platforms,
      sessions_active: row.sessions_active,
      memory: row.memory,
      reported_at: row.reported_at,
    };
  },
});

/** Default number of memory rows returned when the caller gives no limit. */
const DEFAULT_MEMORY_LIMIT = 100;

/**
 * The mirrored memory rows, newest-updated first. `search` is a simple
 * case-insensitive substring match over `content` + `tags` (full FTS stays
 * host-side; this is the lightweight owner-facing filter).
 */
export const listMemories = query({
  args: { search: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { search, limit }): Promise<MemoryDto[]> => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("memories").collect();

    const needle = search?.trim().toLowerCase();
    const filtered = needle
      ? rows.filter(
          (r) =>
            r.content.toLowerCase().includes(needle) ||
            (r.tags ?? []).some((t) => t.toLowerCase().includes(needle)),
        )
      : rows;

    // Newest-updated first; entries without an `updated_at` fall back to their
    // server-stamped `synced_at` so ordering is always total.
    filtered.sort((a, b) => (b.updated_at ?? b.synced_at) - (a.updated_at ?? a.synced_at));

    const cap = limit !== undefined && limit >= 0 ? limit : DEFAULT_MEMORY_LIMIT;
    return filtered.slice(0, cap).map((r) => ({
      entry_id: r.entry_id,
      content: r.content,
      tags: r.tags,
      source: r.source,
      created_at: r.created_at,
      updated_at: r.updated_at,
      synced_at: r.synced_at,
    }));
  },
});

/**
 * Static workspace info for the Settings panel — mostly the contract's `LIMITS`
 * constants plus the deployment URL. `convex_url` comes from the Convex-provided
 * `CONVEX_CLOUD_URL` (the same host the browser already connects to, so it is
 * safe to expose); it is null if unset. `app_version` is omitted: the web
 * package.json version is not bundled into the Convex runtime, and the field is
 * optional by contract.
 */
export const getWorkspaceInfo = query({
  args: {},
  handler: async (ctx): Promise<WorkspaceInfoDto> => {
    await requireOwner(ctx);
    return {
      limits: LIMITS,
      deployment: { convex_url: process.env.CONVEX_CLOUD_URL ?? null },
    };
  },
});
