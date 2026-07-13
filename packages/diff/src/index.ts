/**
 * @hermes/diff — semantic diff engine.
 *
 * OWNERSHIP: CHRONICLE (plan §3, §7). ATLAS created this boundary only. CHRONICLE
 * implements block-level markdown diff (word-level within blocks, rendered inline),
 * mermaid source + before/after, board card-level semantic diff, and html source
 * diff, plus fixtures — in Phase 4 (the product-core thesis gate G4).
 */

export const DIFF_VERSION = "0.0.0-pre-g4" as const;

/** Diff kinds the engine will support (target from plan §3). */
export type DiffKind = "markdown" | "mermaid" | "board" | "html-static";
