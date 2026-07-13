import type { BoardDiff, CardChange, ColumnChange } from "@hermes/diff";
import { Badge, cssVar, Text } from "@hermes/ui";
import type { CSSProperties, ReactNode } from "react";
import { WordTokens } from "./WordTokens";

/**
 * Board semantic diff (plan §3): added / removed / moved / edited cards, column
 * changes — keyed on stable card identity so a drag reads as "moved", not
 * remove+add. Each change is a labelled row; edited cards show the word-level
 * title/body diff inline.
 */

const row: CSSProperties = {
  display: "flex",
  gap: cssVar("space-2"),
  alignItems: "baseline",
  padding: `${cssVar("space-1")} 0`,
  borderBottom: `1px solid ${cssVar("border")}`,
};

function tone(status: string): "success" | "danger" | "accent" | "neutral" {
  if (status === "added") return "success";
  if (status === "removed") return "danger";
  if (status === "moved" || status === "edited" || status === "renamed" || status === "reordered")
    return "accent";
  return "neutral";
}

function ColumnRow({ change }: { change: ColumnChange }) {
  if (change.status === "unchanged") return null;
  const label =
    change.status === "renamed"
      ? `renamed "${change.before}" → "${change.after}"`
      : `${change.status} "${change.title}"`;
  return (
    <div style={row}>
      <Badge tone={tone(change.status)} size="sm" variant="subtle">
        column
      </Badge>
      <Text as="span" size="sm">
        {label}
      </Text>
    </div>
  );
}

function CardRow({ change }: { change: CardChange }) {
  if (change.status === "unchanged") return null;
  let detail: ReactNode;
  switch (change.status) {
    case "added":
      detail = <Text as="span" size="sm">{`"${change.card.title}" in ${change.column}`}</Text>;
      break;
    case "removed":
      detail = <Text as="span" size="sm">{`"${change.card.title}" from ${change.column}`}</Text>;
      break;
    case "moved":
      detail = (
        <Text as="span" size="sm">
          {`"${change.card.title}": ${change.fromColumn} → ${change.toColumn}`}
          {change.edited ? " (and edited)" : ""}
        </Text>
      );
      break;
    case "reordered":
      detail = (
        <Text
          as="span"
          size="sm"
        >{`"${change.card.title}" reordered in ${change.column} (${change.fromIndex} → ${change.toIndex})`}</Text>
      );
      break;
    case "edited":
      detail = (
        <Text as="span" size="sm">
          {change.titleWords ? (
            <WordTokens tokens={change.titleWords} />
          ) : (
            `"${change.after.title}"`
          )}
          {change.bodyWords ? (
            <>
              {" — "}
              <WordTokens tokens={change.bodyWords} />
            </>
          ) : null}
        </Text>
      );
      break;
  }
  return (
    <div style={row}>
      <Badge tone={tone(change.status)} size="sm" variant="subtle">
        {change.status}
      </Badge>
      {detail}
    </div>
  );
}

export interface BoardDiffViewProps {
  diff: BoardDiff;
}

export function BoardDiffView({ diff }: BoardDiffViewProps) {
  if (diff.identical) {
    return (
      <Text size="sm" tone="tertiary">
        No changes — the board is identical to the previous version.
      </Text>
    );
  }
  const columnChanges = diff.columns.filter((c) => c.status !== "unchanged");
  const cardChanges = diff.cards.filter((c) => c.status !== "unchanged");
  return (
    <div className="hc-board-diff">
      <Text size="xs" tone="secondary" weight="medium">
        {`${diff.addedCards} added · ${diff.removedCards} removed · ${diff.movedCards} moved · ${diff.editedCards} edited`}
      </Text>
      <div style={{ marginTop: cssVar("space-2") }}>
        {columnChanges.map((c, i) => (
          <ColumnRow key={`col-${i}`} change={c} />
        ))}
        {cardChanges.map((c, i) => (
          <CardRow key={`card-${i}`} change={c} />
        ))}
      </div>
    </div>
  );
}
