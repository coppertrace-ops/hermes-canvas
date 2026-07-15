"use client";

/**
 * Live Settings panel (PROOF integration, Wave 2). The data half: it subscribes to
 * the `api.settings.*` view models via `backend.ts`, reads live flags from the
 * `FlagsProvider` context, debounces the memory search, tracks in-flight flag
 * flips, and hands fully-resolved props to the pure `SettingsView`. Must be mounted
 * under a Convex provider + `FlagsProvider` (only the live workspace does so).
 *
 * All rendering, empty/loading/error states, and staleness math live in
 * `SettingsView` / `staleness.ts`; this file is data + interaction wiring only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlagKey } from "@hermes/contract";
import { useFlags } from "../flags";
import { SettingsView } from "./SettingsView";
import { useAgentStatus, useMemories, useSetFlag, useWorkspaceInfo } from "./backend";

/** Debounce (ms) between a keystroke and the memory query it drives. */
const SEARCH_DEBOUNCE_MS = 250;

export function SettingsPanel() {
  const agent = useAgentStatus();
  const workspace = useWorkspaceInfo();
  const flags = useFlags();
  const setFlag = useSetFlag();

  // Immediate input value vs the debounced term that actually drives the query.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);
  const memories = useMemories(debouncedSearch);

  // Per-flag in-flight state so a toggle disables + shows busy until it lands.
  const [flagPending, setFlagPending] = useState<Partial<Record<FlagKey, boolean>>>({});
  const onToggleFlag = useCallback(
    (key: FlagKey, enabled: boolean) => {
      setFlagPending((p) => ({ ...p, [key]: true }));
      void setFlag(key, enabled).finally(() => {
        setFlagPending((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      });
    },
    [setFlag],
  );

  const view = useMemo(
    () => (
      <SettingsView
        agent={agent}
        memories={memories}
        memorySearch={searchInput}
        onMemorySearchChange={setSearchInput}
        workspace={workspace}
        flags={flags}
        onToggleFlag={onToggleFlag}
        flagPending={flagPending}
      />
    ),
    [agent, memories, searchInput, workspace, flags, onToggleFlag, flagPending],
  );

  return view;
}
