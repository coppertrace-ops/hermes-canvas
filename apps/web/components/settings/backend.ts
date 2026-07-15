"use client";

/**
 * Convex adapter seam for Settings (PROOF integration, Wave 2).
 *
 * This is the ONE file that touches the live `api.settings.*` surface. Everything
 * else in the Settings feature runs on the plain camelCase view models below, so
 * the presentational view stays pure and testable and the backend contract has a
 * single mapping point. The `api.flags.*` calls used here exist today; the
 * `api.settings.*` calls are the frozen interface the backend agent is building.
 *
 * Each hook must be mounted under a Convex provider (only the live workspace mounts
 * the Settings panel). `undefined` from a query means "still loading"; `null` from
 * `getAgentStatus` means "the connector hasn't reported yet" — the two are distinct
 * and the view renders them differently (loading frame vs honest empty state).
 */

import { useMutation, useQuery } from "convex/react";
import type { FlagKey } from "@hermes/contract";
import { api } from "../../convex/_generated/api";
import type { AgentStatus, MemoryEntry, WorkspaceInfo } from "./SettingsView";

/** Max memory entries pulled per query (the viewer is scan-not-scroll-forever). */
const MEMORY_LIMIT = 200;

/**
 * Live agent status. Returns `undefined` while loading, `null` when nothing has
 * been reported, or the mapped view model.
 */
export function useAgentStatus(): AgentStatus | null | undefined {
  const raw = useQuery(api.settings.getAgentStatus, {});
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  return {
    model: raw.model,
    provider: raw.provider,
    effort: raw.effort ?? undefined,
    fallbacks: raw.fallbacks ?? undefined,
    context: raw.context
      ? { usedTokens: raw.context.used_tokens ?? undefined, maxTokens: raw.context.max_tokens ?? undefined }
      : undefined,
    gateway: raw.gateway
      ? { version: raw.gateway.version ?? undefined, uptimeS: raw.gateway.uptime_s ?? undefined }
      : undefined,
    toolsets: raw.toolsets ?? undefined,
    platforms: raw.platforms ?? undefined,
    sessionsActive: raw.sessions_active ?? undefined,
    memory: raw.memory
      ? { provider: raw.memory.provider ?? undefined, recallBudget: raw.memory.recall_budget ?? undefined }
      : undefined,
    reportedAt: raw.reported_at,
  };
}

/** Live memory entries for `search` (empty string → unfiltered). */
export function useMemories(search: string): MemoryEntry[] | undefined {
  const trimmed = search.trim();
  const raw = useQuery(api.settings.listMemories, {
    search: trimmed.length > 0 ? trimmed : undefined,
    limit: MEMORY_LIMIT,
  });
  if (raw === undefined) return undefined;
  return raw.map((m) => ({
    entryId: m.entry_id,
    content: m.content,
    tags: m.tags ?? undefined,
    source: m.source ?? undefined,
    createdAt: m.created_at ?? undefined,
    updatedAt: m.updated_at ?? undefined,
    syncedAt: m.synced_at,
  }));
}

/** Live workspace info (limits, deployment, app version). */
export function useWorkspaceInfo(): WorkspaceInfo | undefined {
  const raw = useQuery(api.settings.getWorkspaceInfo, {});
  if (raw === undefined) return undefined;
  return {
    limits: raw.limits,
    deployment: raw.deployment ?? undefined,
    appVersion: raw.app_version ?? undefined,
  };
}

/** The owner-guarded flag flip. Returns a caller that awaits the mutation. */
export function useSetFlag(): (key: FlagKey, enabled: boolean) => Promise<void> {
  const setFlag = useMutation(api.flags.setFlag);
  return async (key, enabled) => {
    await setFlag({ key, enabled });
  };
}
