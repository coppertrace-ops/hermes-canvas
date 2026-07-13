/**
 * Version timeline model (plan §3, G4).
 *
 * Turns the append-only `versions` chain into an ordered, UI-shaped timeline
 * where "every write's what/why/when is visible" — the exact G4 reconstruction
 * requirement. Each entry carries the audit pair (`why` = stated intent,
 * `resolvedAction` = recorded effect), the author, and the `contended` flag, plus
 * the derived change scope label so the UI never re-infers what the server
 * already recorded.
 *
 * Pure and stateless: it takes the version list (as delivered by the Convex read
 * query) and returns the view model. It never mutates or reorders history.
 */

import type { ArtifactVersion } from "@hermes/contract";
import { buildHeader } from "./artifact";
import type { ChangeScope } from "./artifact";

export interface TimelineEntry {
  seq: number;
  parentSeq: number | null;
  author: ArtifactVersion["author"];
  agentTurnId?: string;
  /** Stated intent (required for agent writes); the human-readable "why". */
  why?: string;
  /** Server's record of what actually happened — the ground-truth half. */
  resolvedAction: ArtifactVersion["resolved_action"];
  contended: boolean;
  renderState: ArtifactVersion["render_state"];
  createdAt: number;
  /** True for the current head version. */
  isHead: boolean;
  /** True when this version's parent_seq did not equal the head at write time. */
  scope: ChangeScope;
  /** Human label derived from the resolved action ("Whole-document rewrite", …). */
  scopeLabel: string;
  /**
   * True when this write is a stale-parent write whose parent was NOT the version
   * immediately before it — i.e. it forked off an older seq (contention shape).
   */
  forkedFromStaleParent: boolean;
}

export interface VersionTimeline {
  entries: TimelineEntry[];
  headSeq: number;
  /** Count of contended versions in the chain (surfaced as a summary badge). */
  contendedCount: number;
  /** Count of restore versions in the chain. */
  restoreCount: number;
}

function toEntry(v: ArtifactVersion, headSeq: number): TimelineEntry {
  const header = buildHeader({
    seq: v.seq,
    content: v.content,
    renderState: v.render_state,
    resolvedAction: v.resolved_action,
  });
  // A non-contended, in-order write has parent_seq === seq - 1. A write whose
  // recorded parent is older than seq-1 forked off a stale parent.
  const forked = v.parent_seq !== null && v.parent_seq < v.seq - 1;
  return {
    seq: v.seq,
    parentSeq: v.parent_seq,
    author: v.author,
    why: v.why,
    resolvedAction: v.resolved_action,
    contended: v.contended,
    renderState: v.render_state,
    createdAt: v.created_at,
    isHead: v.seq === headSeq,
    scope: header.scope,
    scopeLabel: header.label,
    forkedFromStaleParent: forked,
  };
}

/**
 * Build the timeline newest-first (the display order). `headSeq` marks the head;
 * defaults to the max seq present. Versions are sorted by seq defensively — the
 * append-only store already delivers them ordered, but the model must not rely on
 * input order.
 */
export function buildVersionTimeline(
  versions: readonly ArtifactVersion[],
  headSeq?: number,
): VersionTimeline {
  const sorted = [...versions].sort((a, b) => a.seq - b.seq);
  const head = headSeq ?? (sorted.length > 0 ? sorted[sorted.length - 1]!.seq : 0);
  const entries = sorted.map((v) => toEntry(v, head)).reverse();
  return {
    entries,
    headSeq: head,
    contendedCount: entries.filter((e) => e.contended).length,
    restoreCount: entries.filter((e) => e.scope === "restore").length,
  };
}

/**
 * Prove the chain is append-only intact: seqs are 1..N contiguous with strictly
 * increasing created_at is NOT required (contended writes can interleave), but
 * seqs must be unique and contiguous from the first. Returns the list of any
 * integrity violations — empty means the history is well-formed.
 */
export function checkChainIntegrity(versions: readonly ArtifactVersion[]): string[] {
  const problems: string[] = [];
  const sorted = [...versions].sort((a, b) => a.seq - b.seq);
  const seen = new Set<number>();
  for (let i = 0; i < sorted.length; i++) {
    const v = sorted[i]!;
    if (seen.has(v.seq)) problems.push(`duplicate seq ${v.seq}`);
    seen.add(v.seq);
    const expected = i === 0 ? sorted[0]!.seq : sorted[i - 1]!.seq + 1;
    if (v.seq !== expected) problems.push(`seq gap: expected ${expected}, saw ${v.seq}`);
    if (v.parent_seq !== null && v.parent_seq >= v.seq) {
      problems.push(`seq ${v.seq} has parent_seq ${v.parent_seq} >= seq (not append-only)`);
    }
  }
  return problems;
}
