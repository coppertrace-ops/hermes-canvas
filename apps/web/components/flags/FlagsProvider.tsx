"use client";

/**
 * Feature-flag plumbing for the web app (Wave 2, spec §1; OWNER: LEDGER hook seam).
 *
 * Server-side flags are read via the `flags.getFlags` live query so a prod flip
 * takes effect without a redeploy. This module exposes them to the UI as a React
 * context with a DEFAULT-OFF fallback, so `useFlags()` is safe to call from any
 * surface — including the honest "disabled" placeholders a flagged-off surface
 * renders — in BOTH live and demo modes:
 *
 *  - Live (Convex mounted): `LiveFlags` subscribes to `getFlags`; while the query
 *    is loading (`undefined`) every flag reads OFF (`normalizeFlags`).
 *  - Demo (no Convex client): there is no server-side flag source, so every flag
 *    is OFF. `useQuery` is never called (it requires a provider), avoiding the
 *    "no Convex client" throw.
 *
 * Convex hooks may only run under a provider, so the live subscription lives in a
 * child component (`LiveFlags`) that is mounted exclusively on the `hasConvex`
 * branch — mirroring `IntegrationApp`'s `ConvexWorkspace` split.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { flagsAllOff, normalizeFlags } from "@hermes/contract";
import type { FlagState } from "@hermes/contract";
import { api } from "../../convex/_generated/api";
import { useHasConvex } from "../../app/providers";

const FlagsContext = createContext<FlagState>(flagsAllOff());

/** Read the current flag state. Default-off everywhere a flag isn't explicitly on. */
export function useFlags(): FlagState {
  return useContext(FlagsContext);
}

function LiveFlags({ children }: { children: ReactNode }) {
  const data = useQuery(api.flags.getFlags, {});
  return <FlagsContext.Provider value={normalizeFlags(data)}>{children}</FlagsContext.Provider>;
}

export function FlagsProvider({ children }: { children: ReactNode }) {
  const hasConvex = useHasConvex();
  if (!hasConvex) {
    return <FlagsContext.Provider value={flagsAllOff()}>{children}</FlagsContext.Provider>;
  }
  return <LiveFlags>{children}</LiveFlags>;
}
