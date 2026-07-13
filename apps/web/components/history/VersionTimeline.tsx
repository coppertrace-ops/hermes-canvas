import type { ArtifactVersion } from "@hermes/contract";
import { buildVersionTimeline } from "@hermes/diff";
import type { TimelineEntry } from "@hermes/diff";
import { Badge, cssVar, Text } from "@hermes/ui";
import { useMemo } from "react";
import { VersionMetaHeader } from "./VersionMetaHeader";

/**
 * Version timeline (plan §3, G4). The append-only chain rendered newest-first as
 * a selectable list — every write's what (`resolved_action`) / why / when / who
 * visible, so "a scripted 20-write agent session is fully reconstructable from
 * the UI alone." Selecting an entry drives the diff pane; the selected and the
 * compared-against versions are highlighted.
 */

const item = (selected: boolean, compared: boolean): React.CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  border: `1px solid ${selected ? cssVar("accent") : compared ? cssVar("border-strong") : cssVar("border")}`,
  background: selected
    ? cssVar("accent-subtle")
    : compared
      ? cssVar("surface-hover")
      : cssVar("surface"),
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-3"),
  marginBottom: cssVar("space-2"),
  cursor: "pointer",
});

export interface VersionTimelineProps {
  versions: ArtifactVersion[];
  headSeq?: number;
  /** Currently-selected (viewed) seq. */
  selectedSeq?: number;
  /** The seq being compared against (the diff's "before"). */
  comparedSeq?: number;
  onSelect?: (entry: TimelineEntry) => void;
}

export function VersionTimeline({
  versions,
  headSeq,
  selectedSeq,
  comparedSeq,
  onSelect,
}: VersionTimelineProps) {
  const timeline = useMemo(() => buildVersionTimeline(versions, headSeq), [versions, headSeq]);

  if (timeline.entries.length === 0) {
    return (
      <Text size="sm" tone="tertiary">
        No versions yet.
      </Text>
    );
  }

  return (
    <div className="hc-version-timeline" role="list" aria-label="version history">
      {(timeline.contendedCount > 0 || timeline.restoreCount > 0) && (
        <div style={{ display: "flex", gap: cssVar("space-2"), marginBottom: cssVar("space-3") }}>
          {timeline.contendedCount > 0 && (
            <Badge tone="danger" size="sm" variant="subtle">
              {`${timeline.contendedCount} contended`}
            </Badge>
          )}
          {timeline.restoreCount > 0 && (
            <Badge tone="accent" size="sm" variant="subtle">
              {`${timeline.restoreCount} restored`}
            </Badge>
          )}
        </div>
      )}
      {timeline.entries.map((entry) => (
        <div key={entry.seq} role="listitem">
          <button
            type="button"
            style={item(entry.seq === selectedSeq, entry.seq === comparedSeq)}
            aria-pressed={entry.seq === selectedSeq}
            onClick={() => onSelect?.(entry)}
          >
            <VersionMetaHeader entry={entry} />
          </button>
        </div>
      ))}
    </div>
  );
}
