/**
 * Line- and word-level text diffs (plan §3).
 *
 * `diffLines` produces the raw *source* diff — the safe fallback view every
 * artifact type can fall back to, and the primary view for source-shaped content
 * (mermaid, html). `diffWords` is the word-level diff shown *within* a changed
 * markdown block so the reader sees exactly which words moved, not a whole
 * paragraph flagged red/green (the nbdime legibility lesson).
 */

import { diffSequences, groupOps, statOf } from "./sequences";
import type { DiffStat } from "./sequences";

/** A word/space/punctuation token, preserving the original whitespace runs. */
export interface WordToken {
  type: "eq" | "ins" | "del";
  value: string;
}

/**
 * Split into word / whitespace / punctuation tokens. Whitespace runs are their
 * own tokens (so "the cat" → "the  dog" highlights only cat→dog, not the spaces),
 * and trailing punctuation is split off words ("sessions." → "sessions" + ".") so
 * an edited word still matches across a period — which both sharpens the inline
 * highlight and keeps short-block similarity honest. Reconstruction (join of the
 * `value`s) is exactly the input: the three alternatives partition every char.
 */
export function tokenizeWords(text: string): string[] {
  // A whitespace run, OR a word (unicode letters/digits/_/'), OR any single other char.
  return text.match(/\s+|[\p{L}\p{N}_']+|[^\s]/gu) ?? [];
}

/** Word-level diff of two strings (used within a changed block). */
export function diffWords(before: string, after: string): WordToken[] {
  const ops = diffSequences(tokenizeWords(before), tokenizeWords(after));
  return ops.map((op) => {
    if (op.type === "eq") return { type: "eq", value: op.b };
    if (op.type === "ins") return { type: "ins", value: op.b };
    return { type: "del", value: op.a };
  });
}

/** A unified-diff hunk: a window of context around a cluster of changes. */
export interface LineHunk {
  /** 1-based start line in the OLD text (0 when the hunk is pure insertion at top). */
  oldStart: number;
  /** 1-based start line in the NEW text. */
  newStart: number;
  lines: LineDiffLine[];
}

export interface LineDiffLine {
  type: "eq" | "ins" | "del";
  value: string;
  /** 1-based line number in the old text (undefined for inserts). */
  oldNumber?: number;
  /** 1-based line number in the new text (undefined for deletes). */
  newNumber?: number;
}

export interface LineDiff {
  hunks: LineHunk[];
  stat: DiffStat;
  /** True when the two inputs are byte-identical (no hunks). */
  identical: boolean;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  // Keep a trailing empty line only if the text does not end in a newline, so
  // round-tripping is faithful; normalize CRLF so diffs are content-not-EOL.
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Full line-level diff with unified hunks. `context` controls how many
 * unchanged lines flank each change cluster (default 3, the `diff -u` default).
 */
export function diffLines(before: string, after: string, context = 3): LineDiff {
  const aLines = splitLines(before);
  const bLines = splitLines(after);
  const ops = diffSequences(aLines, bLines);
  const stat = statOf(ops);
  if (stat.added === 0 && stat.removed === 0) {
    return { hunks: [], stat, identical: true };
  }

  // Build a flat annotated line list first, then window it into hunks.
  const flat: LineDiffLine[] = ops.map((op) => {
    if (op.type === "eq") {
      return { type: "eq", value: op.b, oldNumber: op.aIndex + 1, newNumber: op.bIndex + 1 };
    }
    if (op.type === "ins") return { type: "ins", value: op.b, newNumber: op.bIndex + 1 };
    return { type: "del", value: op.a, oldNumber: op.aIndex + 1 };
  });

  const hunks: LineHunk[] = [];
  let i = 0;
  while (i < flat.length) {
    if (flat[i]!.type === "eq") {
      i++;
      continue;
    }
    // Found a change; expand left/right by `context`, merging nearby clusters.
    let start = i;
    let end = i;
    // Extend end to include trailing changes within 2*context of each other.
    let j = i;
    while (j < flat.length) {
      if (flat[j]!.type !== "eq") {
        end = j;
        j++;
        continue;
      }
      // Count the run of eq lines; if it is short enough, keep going (merge).
      let run = 0;
      let k = j;
      while (k < flat.length && flat[k]!.type === "eq") {
        run++;
        k++;
      }
      if (run <= context * 2 && k < flat.length) {
        j = k;
        continue;
      }
      break;
    }
    start = Math.max(0, start - context);
    end = Math.min(flat.length - 1, end + context);
    const lines = flat.slice(start, end + 1);
    const first = lines[0]!;
    hunks.push({
      oldStart: first.oldNumber ?? 0,
      newStart: first.newNumber ?? 0,
      lines,
    });
    i = end + 1;
  }

  return { hunks, stat, identical: false };
}

/** Rejoin word tokens of one side back into text (for assertions / previews). */
export function joinSide(tokens: readonly WordToken[], side: "before" | "after"): string {
  const keep = side === "before" ? ["eq", "del"] : ["eq", "ins"];
  return tokens
    .filter((t) => keep.includes(t.type))
    .map((t) => t.value)
    .join("");
}

export { groupOps };
