/**
 * @hermes/contract — Canvas API contract.
 *
 * OWNERSHIP: LEDGER (see docs/fable-staged-implementation-plan.md §7). ATLAS created
 * this as a package boundary only; LEDGER implements the real schema, zod validators,
 * sequencer types, events, and tool-manifest source here in Phase 1.
 *
 * The stable exports below let other packages compile against a name today. Do not
 * add domain logic here from any agent other than LEDGER — file change requests to
 * the owner instead.
 */

/** Bumped by LEDGER at the G1 contract freeze; after that, additive-only. */
export const CONTRACT_VERSION = "0.0.0-pre-g1" as const;

/** Artifact type union (frozen shape target from the plan §3). Placeholder pending LEDGER. */
export type ArtifactType = "markdown" | "mermaid" | "html-static" | "board";

/** Author of a version. */
export type Author = "human" | "agent";
