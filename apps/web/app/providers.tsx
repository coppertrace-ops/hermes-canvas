"use client";

/**
 * Client providers (OWNER: PROOF integration; auth provider by ATLAS, plan §6).
 *
 * Wires the Convex realtime client when `NEXT_PUBLIC_CONVEX_URL` is configured so
 * live queries/mutations are available to the integration surfaces. When it is
 * absent (or the client cannot be constructed) the app still renders — the
 * integration shell degrades to the clearly-labeled local demo seed rather than
 * crashing. `useHasConvex()` lets a surface decide whether it may call Convex
 * hooks at all (calling `useQuery` with no provider throws).
 *
 * When Convex IS configured, the client is mounted through
 * `ConvexAuthNextjsProvider` (rather than a bare `ConvexProvider`) so live
 * queries/mutations carry the owner's Convex Auth session and `useAuthActions`
 * works. The demo (no-Convex) path is unchanged and auth-free.
 */

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const HasConvexContext = createContext(false);

/** True when a Convex client is mounted above (live hooks are safe to call). */
export function useHasConvex(): boolean {
  return useContext(HasConvexContext);
}

const convexUrl =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string"
    ? process.env.NEXT_PUBLIC_CONVEX_URL
    : undefined;

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo<ConvexReactClient | null>(() => {
    if (!convexUrl) return null;
    try {
      return new ConvexReactClient(convexUrl);
    } catch {
      return null;
    }
  }, []);

  if (!client) {
    return <HasConvexContext.Provider value={false}>{children}</HasConvexContext.Provider>;
  }

  return (
    <HasConvexContext.Provider value={true}>
      <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>
    </HasConvexContext.Provider>
  );
}
