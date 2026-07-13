/**
 * Sequencing + contention (plan §2.2, §3) — PURE.
 *
 * `seq` is assigned by the write, strictly increasing per artifact. A write
 * whose `parent_seq` does not equal the current head still lands (append-only —
 * data loss is impossible) and is flagged `contended`; the UI surfaces a merge
 * prompt. This function encodes exactly that rule and nothing else, so the Convex
 * mutation and the in-memory reference core cannot diverge on it.
 */

export interface SeqPlan {
  /** The seq this write will produce. */
  seq: number;
  /** The parent this write claims to be based on. */
  parentSeq: number;
  /** True when parentSeq != headSeq at write time. */
  contended: boolean;
}

/**
 * Plan the next version's seq given the artifact's current head and the parent
 * the writer based its edit on. Head starts at 0 (no versions); the first
 * version is seq 1.
 */
export function planSeq(headSeq: number, parentSeq: number): SeqPlan {
  return {
    seq: headSeq + 1,
    parentSeq,
    contended: parentSeq !== headSeq,
  };
}

/** The seq of an artifact's first (create) version. */
export const FIRST_SEQ = 1;
