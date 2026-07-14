import { z } from "zod";

/**
 * Server-side feature flags (Wave 2, spec §1; OWNER: LEDGER).
 *
 * The single source of truth for the closed set of flag keys and the default-off
 * flag state. Shared so the Convex `flags.setFlag` mutation validates against the
 * exact same closed set the web `useFlags()` hook normalizes against — one
 * definition, no drift.
 *
 * Invariants encoded here:
 *  - The key set is CLOSED. An unknown key is rejected by the mutation, never
 *    silently stored.
 *  - Default state is OFF. An absent `flags` row (or a loading live query) reads
 *    as `false` — the code never defaults a flag to on.
 */

/** The closed set of flag keys. Adding a flag = adding to this tuple (additive). */
export const FLAG_KEYS = ["html_artifacts", "boards", "jobs_tab"] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

/** The full boolean state of every flag. Every key is always present. */
export type FlagState = Record<FlagKey, boolean>;

export const flagKeySchema = z.enum(FLAG_KEYS);

/** True iff `key` is one of the closed, known flag keys. */
export function isFlagKey(key: string): key is FlagKey {
  return (FLAG_KEYS as readonly string[]).includes(key);
}

/** The default state: every flag OFF. Fresh object each call (never shared/mutated). */
export function flagsAllOff(): FlagState {
  return FLAG_KEYS.reduce((acc, k) => {
    acc[k] = false;
    return acc;
  }, {} as FlagState);
}

/**
 * Fill a partial/loading flag map into a complete `FlagState`, defaulting every
 * absent or non-true value to OFF. Accepts `undefined` (live query not yet
 * loaded, or demo mode) → all off. Unknown keys in the input are ignored.
 */
export function normalizeFlags(partial: Partial<Record<string, boolean>> | undefined): FlagState {
  const state = flagsAllOff();
  if (!partial) return state;
  for (const k of FLAG_KEYS) {
    state[k] = partial[k] === true;
  }
  return state;
}
