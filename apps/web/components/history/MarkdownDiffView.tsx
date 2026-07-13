import type { MarkdownDiff } from "@hermes/diff";
import { Markdown } from "@hermes/render";
import { cssVar, Text } from "@hermes/ui";
import type { CSSProperties, ReactNode } from "react";
import { WordTokens } from "./WordTokens";

/**
 * Rendered inline Markdown diff (plan §3): insertions/deletions highlighted in
 * the RENDERED output, not raw text. Whole added/removed/unchanged blocks render
 * as real Markdown (via `@hermes/render`, so the sanitizer + external-image
 * blocking still apply) with a colored gutter; a changed block renders its
 * word-level diff inline so the reader sees exactly which words moved. The
 * raw-source fallback is the dispatcher's `source` view, never this one.
 */

const gutter = (color: string, bg: string): CSSProperties => ({
  borderLeft: `3px solid ${color}`,
  background: bg,
  paddingLeft: cssVar("space-3"),
  paddingTop: cssVar("space-1"),
  paddingBottom: cssVar("space-1"),
  marginBottom: cssVar("space-2"),
});

function Row({
  tone,
  label,
  children,
}: {
  tone: "added" | "removed" | "unchanged" | "changed";
  label: string;
  children: ReactNode;
}) {
  const style =
    tone === "added"
      ? gutter(cssVar("success"), cssVar("success-subtle"))
      : tone === "removed"
        ? gutter(cssVar("danger"), cssVar("danger-subtle"))
        : tone === "changed"
          ? gutter(cssVar("accent"), cssVar("accent-subtle"))
          : gutter("transparent", "transparent");
  return (
    <div style={style} data-diff-block={tone}>
      {tone !== "unchanged" && (
        <Text
          as="span"
          size="xs"
          weight="medium"
          tone={tone === "removed" ? "danger" : tone === "added" ? "success" : "accent"}
          mono
        >
          {label}
        </Text>
      )}
      {children}
    </div>
  );
}

export interface MarkdownDiffViewProps {
  diff: MarkdownDiff;
}

export function MarkdownDiffView({ diff }: MarkdownDiffViewProps) {
  if (diff.identical) {
    return (
      <Text size="sm" tone="tertiary">
        No changes — the document is identical to the previous version.
      </Text>
    );
  }
  return (
    <div className="hc-md-diff">
      {diff.blocks.map((b, i) => {
        switch (b.status) {
          case "unchanged":
            return (
              <Row key={i} tone="unchanged" label="">
                <Markdown source={b.block.text} />
              </Row>
            );
          case "added":
            return (
              <Row key={i} tone="added" label="＋ added">
                <Markdown source={b.block.text} />
              </Row>
            );
          case "removed":
            return (
              <Row key={i} tone="removed" label="－ removed">
                <Markdown source={b.block.text} />
              </Row>
            );
          case "changed":
            return (
              <Row key={i} tone="changed" label="~ changed">
                <Text as="div" size="base" style={{ whiteSpace: "pre-wrap" }}>
                  <WordTokens tokens={b.words} />
                </Text>
              </Row>
            );
        }
      })}
    </div>
  );
}
