import type { Anchor } from "./edit";
import { CanvasError } from "./errors";
import { byteLength } from "./limits";
import type { ByteRange, ResolvedAction } from "./resolvedAction";

/**
 * Region-edit resolution (plan §2.2, §2.3) — PURE.
 *
 * Given the parent version's content and a region anchor, produce the full new
 * snapshot and the exact byte range the new content occupies in it. Whole-doc
 * writes are handled by the caller; this module only resolves regions. Keeping
 * this pure is what lets Gate G1 be proven without a Convex deployment.
 *
 * Line handling preserves the document's newline convention: we split on "\n",
 * operate on line indices, and rejoin with "\n". A heading anchor targets the
 * markdown section that *starts* at the matched ATX heading and runs until the
 * next heading of the same-or-higher level (or end of document).
 */

export interface RegionResolution {
  /** The complete new document after applying the region edit. */
  content: string;
  /** Byte range in `content` occupied by the newly written text. */
  byteRange: ByteRange;
  /** Human-readable description of what was resolved, for `resolved_action.region`. */
  description: string;
}

const ATX_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

function headingLevel(line: string): number | null {
  const m = ATX_HEADING.exec(line);
  return m && m[1] ? m[1].length : null;
}

function headingText(line: string): string | null {
  const m = ATX_HEADING.exec(line);
  return m && m[2] !== undefined ? m[2].trim() : null;
}

/**
 * Resolve a heading anchor to an inclusive [startLine, endLine] range covering
 * the heading line through the last line before the next same-or-higher heading.
 */
function resolveHeadingRange(lines: string[], heading: string): { start: number; end: number } {
  const target = heading.trim();
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (headingText(line) === target) {
      start = i;
      level = headingLevel(line) ?? 1;
      break;
    }
  }
  if (start === -1) {
    throw CanvasError.validation(`region anchor heading not found: "${target}"`, {
      anchor: { heading: target },
    });
  }
  let end = lines.length - 1;
  for (let i = start + 1; i < lines.length; i++) {
    const lvl = headingLevel(lines[i] ?? "");
    if (lvl !== null && lvl <= level) {
      end = i - 1;
      break;
    }
  }
  return { start, end };
}

function resolveLineRange(lines: string[], startLine: number, endLine: number): { start: number; end: number } {
  if (startLine > endLine) {
    throw CanvasError.validation(`region anchor start_line (${startLine}) > end_line (${endLine})`);
  }
  // 1-based inclusive -> 0-based indices.
  const start = startLine - 1;
  const end = endLine - 1;
  if (start < 0 || end >= lines.length) {
    throw CanvasError.validation(
      `region anchor lines ${startLine}-${endLine} out of range (document has ${lines.length} lines)`,
    );
  }
  return { start, end };
}

/**
 * Apply a region edit to `parentContent`, returning the new snapshot, the byte
 * range the new content occupies, and a description. The replacement content
 * substitutes the resolved line span exactly (no implicit newline juggling
 * beyond the "\n" join).
 */
export function resolveRegionEdit(parentContent: string, anchor: Anchor, newContent: string): RegionResolution {
  const lines = parentContent.split("\n");
  const range =
    "heading" in anchor
      ? resolveHeadingRange(lines, anchor.heading)
      : resolveLineRange(lines, anchor.start_line, anchor.end_line);

  const before = lines.slice(0, range.start);
  const after = lines.slice(range.end + 1);
  const replacement = newContent.split("\n");

  const newLines = [...before, ...replacement, ...after];
  const content = newLines.join("\n");

  // Byte offset where the replacement begins = bytes of all preceding lines plus
  // their joining newlines.
  const prefix = before.length > 0 ? before.join("\n") + "\n" : "";
  const startByte = byteLength(prefix);
  const endByte = startByte + byteLength(newContent);

  const description =
    "heading" in anchor
      ? `heading:"${anchor.heading}" (lines ${range.start + 1}-${range.end + 1})`
      : `lines ${range.start + 1}-${range.end + 1}`;

  return { content, byteRange: { start: startByte, end: endByte }, description };
}

/** Build the resolved_action for a region edit outcome. */
export function regionResolvedAction(artifactId: string, res: RegionResolution): ResolvedAction {
  return {
    op: "region",
    target: artifactId,
    region: res.description,
    byte_range: res.byteRange,
  };
}
