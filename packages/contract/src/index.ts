/**
 * @hermes/contract — Canvas API contract (OWNER: LEDGER, plan §2–§3).
 *
 * Single source of truth for: zod request/response schemas, stored record shapes
 * (mirrored by the Convex schema), the pure sequencer / region-edit / rate-limit /
 * validation logic, the append-only in-memory reference core, and the Hermes tool
 * manifest. After the G1 contract freeze, changes here are additive-only.
 */

/** Bumped by LEDGER at the G1 contract freeze; after that, additive-only. */
export const CONTRACT_VERSION = "1.0.0-g1" as const;

export * from "./limits";
export * from "./errors";
export * from "./artifact";
export * from "./board";
export * from "./edit";
export * from "./events";
export * from "./flags";
export * from "./resolvedAction";
export * from "./job";
export * from "./status";
export * from "./toolCall";
export * from "./tab";
export * from "./api";
export * from "./records";
export * from "./region";
export * from "./sequencer";
export * from "./ratelimit";
export * from "./validate";
export * from "./plan";
export * from "./core";
export * from "./manifest";
