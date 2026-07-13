/**
 * Markdown structural diff (plan §3 — "where legibility actually lives").
 *
 * Block-level structural diff, word-level within changed blocks. The output is a
 * view model the `DiffView` renders *inline* (insertions/deletions highlighted in
 * rendered output), with `diffLines` as the raw-source fallback. Whole-document
 * rewrites and localized region edits produce visibly different shapes: a rewrite
 * is a long run of changed blocks; a region edit is one changed block amid a sea
 * of unchanged ones — the adversarial G4 cases.
 *
 * This module is deliberately parser-light: it segments Markdown into blocks by
 * blank-line boundaries (with fenced code kept atomic) rather than depending on
 * the renderer's AST. It classifies each block only enough to label it; the
 * rendered highlighting is the renderer's job downstream.
 */

import { diffSequences, groupOps } from "./sequences";
import { diffWords } from "./text";
import type { WordToken } from "./text";

export type BlockKind = "heading" | "paragraph" | "code" | "list" | "quote" | "hr" | "table";

export interface MarkdownBlock {
  /** Raw source text of the block (no surrounding blank lines). */
  text: string;
  kind: BlockKind;
  /** 1-based first source line of the block in its document. */
  startLine: number;
}

export type MarkdownBlockDiff =
  | { status: "unchanged"; block: MarkdownBlock }
  | { status: "added"; block: MarkdownBlock }
  | { status: "removed"; block: MarkdownBlock }
  | {
      status: "changed";
      before: MarkdownBlock;
      after: MarkdownBlock;
      /** Word-level diff of the two blocks' source, for inline highlighting. */
      words: WordToken[];
    };

export interface MarkdownDiff {
  blocks: MarkdownBlockDiff[];
  /** Count of changed/added/removed blocks — drives the "N blocks changed" summary. */
  changedBlocks: number;
  addedBlocks: number;
  removedBlocks: number;
  /** True when every block is unchanged. */
  identical: boolean;
}

function classify(text: string): BlockKind {
  const first = text.trimStart();
  if (/^```|^~~~/.test(first)) return "code";
  if (/^#{1,6}\s/.test(first)) return "heading";
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(first)) return "hr";
  if (/^>/.test(first)) return "quote";
  if (/^(\s*)([-*+]\s|\d+[.)]\s)/.test(first)) return "list";
  if (/^\|.*\|/.test(first) && /\n\s*\|?[-:\s|]+\|/.test(text)) return "table";
  return "paragraph";
}

/**
 * Segment Markdown into blocks. Blank lines separate blocks; a fenced code block
 * (``` or ~~~) is atomic even when it contains blank lines. Loss-less: the block
 * texts plus their separators reconstruct the source.
 */
export function segmentBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let buf: string[] = [];
  let bufStart = 0;
  let inFence = false;
  let fenceMarker = "";

  const flush = () => {
    if (buf.length === 0) return;
    // Trim trailing blank lines that belong to the separator, keep inner ones.
    while (buf.length > 0 && buf[buf.length - 1]!.trim() === "") buf.pop();
    if (buf.length === 0) return;
    const text = buf.join("\n");
    blocks.push({ text, kind: classify(text), startLine: bufStart + 1 });
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fenceOpen = /^(\s*)(```|~~~)/.exec(line);
    if (!inFence && fenceOpen) {
      if (buf.length === 0) bufStart = i;
      inFence = true;
      fenceMarker = fenceOpen[2]!;
      buf.push(line);
      continue;
    }
    if (inFence) {
      buf.push(line);
      if (new RegExp(`^\\s*${fenceMarker}\\s*$`).test(line)) {
        inFence = false;
        flush();
      }
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (buf.length === 0) bufStart = i;
    buf.push(line);
  }
  flush();
  return blocks;
}

/** Word-level similarity in [0,1]: shared words / total distinct token positions. */
function similarity(a: string, b: string): number {
  const words = diffWords(a, b);
  let eq = 0;
  let total = 0;
  for (const w of words) {
    if (w.value.trim() === "") continue; // ignore whitespace tokens
    total++;
    if (w.type === "eq") eq++;
  }
  return total === 0 ? 1 : eq / total;
}

/** Above this word-similarity, a removed+added pair is a "changed" block, not two. */
const CHANGE_THRESHOLD = 0.3;

/**
 * Structural block diff. Adjacent removed/added runs are zipped into `changed`
 * pairs when the two blocks are similar enough (so an edited paragraph reads as
 * one changed block with word highlights, not a delete beside an unrelated add).
 */
export function diffMarkdown(before: string, after: string): MarkdownDiff {
  const aBlocks = segmentBlocks(before);
  const bBlocks = segmentBlocks(after);
  const ops = diffSequences(aBlocks, bBlocks, (x, y) => x.text === y.text);
  const runs = groupOps(ops);

  const out: MarkdownBlockDiff[] = [];
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r]!;
    if (run.type === "eq") {
      for (const block of run.items) out.push({ status: "unchanged", block });
      continue;
    }
    if (run.type === "del") {
      const next = runs[r + 1];
      if (next && next.type === "ins") {
        // Zip del/ins into changed pairs by position + similarity.
        const dels = run.items;
        const inss = next.items;
        const pairs = Math.min(dels.length, inss.length);
        for (let i = 0; i < pairs; i++) {
          const before2 = dels[i]!;
          const after2 = inss[i]!;
          if (similarity(before2.text, after2.text) >= CHANGE_THRESHOLD) {
            out.push({
              status: "changed",
              before: before2,
              after: after2,
              words: diffWords(before2.text, after2.text),
            });
          } else {
            out.push({ status: "removed", block: before2 });
            out.push({ status: "added", block: after2 });
          }
        }
        for (let i = pairs; i < dels.length; i++) out.push({ status: "removed", block: dels[i]! });
        for (let i = pairs; i < inss.length; i++) out.push({ status: "added", block: inss[i]! });
        r++; // consumed the ins run
        continue;
      }
      for (const block of run.items) out.push({ status: "removed", block });
      continue;
    }
    // pure insert run
    for (const block of run.items) out.push({ status: "added", block });
  }

  let changed = 0;
  let added = 0;
  let removed = 0;
  for (const b of out) {
    if (b.status === "changed") changed++;
    else if (b.status === "added") added++;
    else if (b.status === "removed") removed++;
  }
  return {
    blocks: out,
    changedBlocks: changed,
    addedBlocks: added,
    removedBlocks: removed,
    identical: changed === 0 && added === 0 && removed === 0,
  };
}
