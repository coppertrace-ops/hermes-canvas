/**
 * Contended-write merge prompt model (plan §2.2, §3).
 *
 * When a write's `parent_seq !== head_seq`, the platform still lands it
 * (append-only — data loss is impossible) and flags it `contended`. The UI's job
 * is to make that visible and offer a resolution — never to silently drop a side.
 * This builds the pure prompt model: the two competing versions (the head the
 * writer did NOT see, and the contended write), their common ancestor, a diff of
 * each against the base, and the safe resolution options (all of which are
 * append-only new writes, per §3).
 */

import type { ArtifactType, ArtifactVersion } from "@hermes/contract";
import { diffArtifact } from "./artifact";
import type { ArtifactDiff } from "./artifact";

export type MergeResolution =
  /** Keep the current head; the contended write remains in history but not head. */
  | { kind: "keep_head" }
  /** Restore the contended version's content as a new head version (append-only). */
  | { kind: "take_contended" }
  /** Author a fresh version by hand, starting from either side. */
  | { kind: "manual"; from: "head" | "contended" };

export interface MergePrompt {
  artifactId: string;
  type: ArtifactType;
  /** The common ancestor both writers based on (the contended write's parent). */
  baseSeq: number | null;
  /** The head the contended writer did not see. */
  headSeq: number;
  /** The contended write's seq (later in the chain, but forked off `baseSeq`). */
  contendedSeq: number;
  /** Diff of the head vs the base — "what changed underneath the agent". */
  headVsBase: ArtifactDiff | null;
  /** Diff of the contended write vs the base — "what the agent intended". */
  contendedVsBase: ArtifactDiff | null;
  /** Diff of contended vs head — the net reconciliation the reader weighs. */
  contendedVsHead: ArtifactDiff;
  /** The safe resolution options, all append-only. */
  options: MergeResolution[];
  /** Human summary line for the prompt banner. */
  summary: string;
}

function findVersion(
  versions: readonly ArtifactVersion[],
  seq: number | null,
): ArtifactVersion | null {
  if (seq === null) return null;
  return versions.find((v) => v.seq === seq) ?? null;
}

function toInput(v: ArtifactVersion | null) {
  return v
    ? {
        seq: v.seq,
        content: v.content,
        renderState: v.render_state,
        resolvedAction: v.resolved_action,
      }
    : null;
}

/**
 * Build the merge prompt for a contended version. `contendedSeq` is the version
 * flagged `contended`; the head is the current head_seq. Throws if the contended
 * version is not present. If the contended write is not actually flagged
 * `contended`, the prompt is still built (integration may want to preview) but
 * `summary` says so.
 */
export function buildMergePrompt(
  type: ArtifactType,
  versions: readonly ArtifactVersion[],
  contendedSeq: number,
  headSeq?: number,
): MergePrompt {
  const contended = versions.find((v) => v.seq === contendedSeq);
  if (!contended) throw new Error(`cannot build merge prompt: version ${contendedSeq} not found`);
  const head = headSeq ?? versions.reduce((m, v) => Math.max(m, v.seq), 0);
  const headVersion = versions.find((v) => v.seq === head) ?? contended;
  const base = findVersion(versions, contended.parent_seq);

  const baseInput = toInput(base);
  const headVsBase = baseInput
    ? diffArtifact(type, baseInput, toInput(headVersion)!)
    : diffArtifact(type, null, toInput(headVersion)!);
  const contendedVsBase = baseInput
    ? diffArtifact(type, baseInput, toInput(contended)!)
    : diffArtifact(type, null, toInput(contended)!);
  const contendedVsHead = diffArtifact(type, toInput(headVersion), toInput(contended)!);

  const summary = contended.contended
    ? `v${contendedSeq} was written against v${contended.parent_seq ?? "∅"} but head had already advanced to v${head}. ` +
      `Both versions are preserved — choose how to reconcile.`
    : `v${contendedSeq} is not flagged contended; showing a comparison against head v${head}.`;

  return {
    artifactId: contended.artifact_id,
    type,
    baseSeq: contended.parent_seq,
    headSeq: head,
    contendedSeq,
    headVsBase,
    contendedVsBase,
    contendedVsHead,
    options: [
      { kind: "keep_head" },
      { kind: "take_contended" },
      { kind: "manual", from: "head" },
      { kind: "manual", from: "contended" },
    ],
    summary,
  };
}

/** Find every contended version in a chain — drives the "needs review" list. */
export function contendedVersions(versions: readonly ArtifactVersion[]): number[] {
  return versions
    .filter((v) => v.contended)
    .map((v) => v.seq)
    .sort((a, b) => a - b);
}
