/**
 * Restore model (plan §3): "Restore = a new version whose content equals an old
 * one, resolved_action.op = 'restore'. History that lies is worse than no
 * history."
 *
 * This is the pure, safe *confirmation* model the UI shows before calling the
 * (LEDGER-owned) restore mutation. It never mutates anything: it predicts the seq
 * the restore will produce (`head + 1`), spells out that the restore is
 * append-only (the current head is preserved, not overwritten), and surfaces the
 * one honest caveat — restoring an old version discards nothing, but the reader
 * should understand they are moving *forward* to old content, not rewinding.
 */

import type { ArtifactVersion, ResolvedAction } from "@hermes/contract";

export interface RestorePreview {
  /** The version whose content is being reinstated. */
  sourceSeq: number;
  /** The current head; restore appends AFTER this — head is never overwritten. */
  currentHeadSeq: number;
  /** The seq the restore will create (always head + 1). */
  resultingSeq: number;
  /** Predicted resolved_action the server will record (for the confirm preview). */
  resolvedActionPreview: ResolvedAction;
  /** True when restoring the current head — a no-op the UI should disable. */
  isNoop: boolean;
  /**
   * Human confirmation copy. Deliberately states the append-only guarantee: the
   * restore does not delete or rewind anything; it adds a new version equal to
   * the chosen one.
   */
  message: string;
}

/**
 * Build the confirmation preview for restoring `sourceSeq`. `versions` is the
 * artifact's version list (to validate the source exists and find the head).
 * Throws if the source seq is not present — a restore can only target real
 * history.
 */
export function previewRestore(
  versions: readonly ArtifactVersion[],
  sourceSeq: number,
  headSeq?: number,
): RestorePreview {
  const source = versions.find((v) => v.seq === sourceSeq);
  if (!source) throw new Error(`cannot restore: version ${sourceSeq} not found`);
  const head = headSeq ?? versions.reduce((max, v) => Math.max(max, v.seq), 0);
  const resultingSeq = head + 1;
  const isNoop = sourceSeq === head;

  const resolvedActionPreview: ResolvedAction = {
    op: "restore",
    target: source.artifact_id,
    restored_from_seq: sourceSeq,
  };

  const message = isNoop
    ? `v${sourceSeq} is already the current version — restoring it would be a no-op.`
    : `Restore the content of v${sourceSeq} as a new version (v${resultingSeq}). ` +
      `This is append-only: the current v${head} is kept, and v${resultingSeq} will be a fresh version whose content equals v${sourceSeq}.`;

  return { sourceSeq, currentHeadSeq: head, resultingSeq, resolvedActionPreview, isNoop, message };
}

/**
 * Assert that a completed restore actually appended (used by tests / integration
 * to prove the append-only guarantee). Given the version list BEFORE and AFTER a
 * restore, returns problems if any prior version changed or the new head is not
 * exactly `beforeHead + 1` with `op: 'restore'`.
 */
export function verifyRestoreAppended(
  before: readonly ArtifactVersion[],
  after: readonly ArtifactVersion[],
  sourceSeq: number,
): string[] {
  const problems: string[] = [];
  const beforeHead = before.reduce((m, v) => Math.max(m, v.seq), 0);
  const afterHead = after.reduce((m, v) => Math.max(m, v.seq), 0);

  if (afterHead !== beforeHead + 1) {
    problems.push(`expected new head ${beforeHead + 1}, saw ${afterHead}`);
  }
  // Every pre-existing version must be byte-identical afterwards (nothing rewritten).
  for (const prev of before) {
    const still = after.find((v) => v.seq === prev.seq);
    if (!still) problems.push(`version ${prev.seq} disappeared after restore (history rewritten)`);
    else if (still.content !== prev.content)
      problems.push(`version ${prev.seq} content changed after restore`);
  }
  const newVersion = after.find((v) => v.seq === afterHead);
  const source = before.find((v) => v.seq === sourceSeq);
  if (newVersion && source && newVersion.content !== source.content) {
    problems.push(`restored version content does not equal source v${sourceSeq}`);
  }
  if (newVersion && newVersion.resolved_action.op !== "restore") {
    problems.push(`restored version op is '${newVersion.resolved_action.op}', expected 'restore'`);
  }
  return problems;
}
