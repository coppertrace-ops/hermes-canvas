import type { WordToken } from "@hermes/diff";
import { cssVar } from "@hermes/ui";
import type { CSSProperties } from "react";

/**
 * Inline word-level highlight (plan §3 — "word-level within changed blocks,
 * rendered inline"). Insertions and deletions are marked semantically (`<ins>` /
 * `<del>`) so meaning never rides on color alone, and tinted with the subtle
 * success/danger surfaces so dark and light both read correctly.
 */

const insStyle: CSSProperties = {
  background: cssVar("success-subtle"),
  color: cssVar("text"),
  textDecoration: "none",
  borderRadius: cssVar("radius-xs"),
  padding: "0 2px",
};

const delStyle: CSSProperties = {
  background: cssVar("danger-subtle"),
  color: cssVar("text-secondary"),
  textDecoration: "line-through",
  borderRadius: cssVar("radius-xs"),
  padding: "0 2px",
};

export interface WordTokensProps {
  tokens: readonly WordToken[];
  /** Which sides to show. Default shows both (unified inline). */
  show?: "both" | "before" | "after";
}

export function WordTokens({ tokens, show = "both" }: WordTokensProps) {
  return (
    <span className="hc-word-tokens">
      {tokens.map((t, i) => {
        if (t.type === "eq") return <span key={i}>{t.value}</span>;
        if (t.type === "ins") {
          if (show === "before") return null;
          return (
            <ins key={i} style={insStyle} aria-label={`inserted: ${t.value}`}>
              {t.value}
            </ins>
          );
        }
        // del
        if (show === "after") return null;
        return (
          <del key={i} style={delStyle} aria-label={`deleted: ${t.value}`}>
            {t.value}
          </del>
        );
      })}
    </span>
  );
}
