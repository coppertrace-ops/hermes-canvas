import type { LineDiff } from "@hermes/diff";
import { cssVar, Text } from "@hermes/ui";
import type { CSSProperties } from "react";

/**
 * Raw unified source diff — the fallback view for Markdown (plan §3 "Raw source
 * diff is the fallback view, never the primary") and the primary textual view for
 * Mermaid / HTML source. Line-numbered, gutter-marked, monospace, and honest: an
 * identical pair shows an explicit "no changes" state rather than a blank box.
 */

const rowBase: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "3ch 3ch 1ch 1fr",
  gap: cssVar("space-2"),
  fontFamily: cssVar("font-mono"),
  fontSize: cssVar("font-size-sm"),
  lineHeight: cssVar("line-snug"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const gutter: CSSProperties = {
  color: cssVar("text-tertiary"),
  textAlign: "right",
  userSelect: "none",
};

const marks = {
  eq: { sign: " ", bg: "transparent" },
  ins: { sign: "+", bg: cssVar("success-subtle") },
  del: { sign: "-", bg: cssVar("danger-subtle") },
} as const;

export interface SourceDiffProps {
  diff: LineDiff;
  className?: string;
}

export function SourceDiff({ diff, className }: SourceDiffProps) {
  if (diff.identical) {
    return (
      <Text size="sm" tone="tertiary" className={className}>
        No changes — both versions are byte-identical.
      </Text>
    );
  }
  return (
    <div className={className} role="table" aria-label="source diff">
      {diff.hunks.map((hunk, hi) => (
        <div key={hi} role="rowgroup" style={{ marginBottom: cssVar("space-3") }}>
          <div
            role="row"
            style={{
              ...rowBase,
              color: cssVar("text-tertiary"),
              background: cssVar("surface-sunken"),
              padding: `0 ${cssVar("space-2")}`,
            }}
          >
            <span
              style={{ gridColumn: "1 / -1" }}
            >{`@@ -${hunk.oldStart} +${hunk.newStart} @@`}</span>
          </div>
          {hunk.lines.map((line, li) => {
            const mark = marks[line.type];
            return (
              <div key={li} role="row" style={{ ...rowBase, background: mark.bg }}>
                <span style={gutter}>{line.oldNumber ?? ""}</span>
                <span style={gutter}>{line.newNumber ?? ""}</span>
                <span aria-hidden style={{ color: cssVar("text-tertiary") }}>
                  {mark.sign}
                </span>
                <span>{line.value === "" ? " " : line.value}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
