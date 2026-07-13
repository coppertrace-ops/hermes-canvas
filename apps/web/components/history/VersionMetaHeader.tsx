import type { TimelineEntry } from "@hermes/diff";
import { Badge, cssVar, Text } from "@hermes/ui";
import type { CSSProperties } from "react";

/**
 * Per-version metadata header (plan §3: "Every agent version's header shows
 * `why`, `resolved_action`, `contended` state, and author").
 *
 * This renders the audit pair side by side — the writer's stated intent (`why`)
 * against the server's record of effect (`resolved_action`) — plus author,
 * contended state, and timestamp. It is the honesty core of the history UI: the
 * agent's self-description and the system's ground truth are never conflated.
 */

const wrap: CSSProperties = { display: "flex", flexDirection: "column", gap: cssVar("space-1") };
const rowCss: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: cssVar("space-2"),
};

function resolvedActionSummary(entry: TimelineEntry): string {
  const ra = entry.resolvedAction;
  const parts: string[] = [ra.op];
  if (ra.region) parts.push(ra.region);
  if (ra.byte_range) parts.push(`bytes ${ra.byte_range.start}–${ra.byte_range.end}`);
  if (ra.restored_from_seq !== undefined) parts.push(`from v${ra.restored_from_seq}`);
  return parts.join(" · ");
}

function formatTime(ms: number): string {
  // Deterministic, locale-stable ISO minute (avoids SSR/client hydration drift).
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

export interface VersionMetaHeaderProps {
  entry: TimelineEntry;
  compact?: boolean;
}

export function VersionMetaHeader({ entry, compact }: VersionMetaHeaderProps) {
  return (
    <div style={wrap} data-version-seq={entry.seq}>
      <div style={rowCss}>
        <Text as="span" size="sm" weight="semibold" mono>
          v{entry.seq}
        </Text>
        {entry.isHead && (
          <Badge tone="accent" size="sm" variant="subtle">
            head
          </Badge>
        )}
        <Badge tone={entry.author === "agent" ? "neutral" : "success"} size="sm" variant="subtle">
          {entry.author}
        </Badge>
        <Badge
          tone={
            entry.scope === "replace_all"
              ? "warning"
              : entry.scope === "restore"
                ? "accent"
                : "neutral"
          }
          size="sm"
          variant="outline"
        >
          {entry.scopeLabel}
        </Badge>
        {entry.contended && (
          <Badge
            tone="danger"
            size="sm"
            variant="solid"
            aria-label="contended write — parent was stale"
          >
            contended
          </Badge>
        )}
        {entry.renderState === "render_error" && (
          <Badge tone="danger" size="sm" variant="subtle">
            render error
          </Badge>
        )}
        <Text as="span" size="xs" tone="tertiary" mono>
          {formatTime(entry.createdAt)}
        </Text>
      </div>

      {/* The audit pair: stated intent vs. recorded effect. */}
      {!compact && (
        <div style={rowCss}>
          <Text as="span" size="sm" tone="secondary">
            <Text as="span" size="xs" tone="tertiary" weight="medium" mono>
              why:{" "}
            </Text>
            {entry.why ? `“${entry.why}”` : "— (no stated intent)"}
          </Text>
        </div>
      )}
      {!compact && (
        <div style={rowCss}>
          <Text as="span" size="xs" tone="tertiary" weight="medium" mono>
            recorded:{" "}
          </Text>
          <Text as="span" size="sm" tone="secondary" mono>
            {resolvedActionSummary(entry)}
          </Text>
          {entry.forkedFromStaleParent && entry.parentSeq !== null && (
            <Text as="span" size="xs" tone="danger" mono>
              (based on stale v{entry.parentSeq})
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
