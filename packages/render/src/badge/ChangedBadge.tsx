import { Badge, StatusDot } from "@hermes/ui";

/**
 * Changed-since-you-last-looked indicator (PANES; plan §3).
 *
 * An artifact is "changed" when `head_seq > last_seen.seq`; a tab aggregates its
 * changed artifacts into a count. This is the most-requested legibility feature
 * in the canvas evidence, so it is deliberately prominent but restrained:
 *
 * - `count === 0` ⇒ renders nothing (no badge, no dot). Never a stale "0".
 * - a tab with a positive count ⇒ an accent count Badge (aggregate).
 * - a single artifact ⇒ a small accent StatusDot (`dot`), which reads as "new"
 *   without claiming a number.
 *
 * Meaning never rides on color alone: the badge carries a number and an
 * accessible label; the dot is labelled for assistive tech.
 */
export interface ChangedBadgeProps {
  /**
   * Number of unseen changes. For a single artifact pass `changed ? 1 : 0`.
   * `<= 0` renders nothing.
   */
  count: number;
  /** Render as a numberless dot instead of a count (per-artifact use). */
  dot?: boolean;
  /** Accessible label prefix, e.g. the tab or artifact title. */
  label?: string;
  className?: string;
}

export function ChangedBadge({ count, dot = false, label, className }: ChangedBadgeProps) {
  if (count <= 0) return null;

  const a11y = label
    ? `${label}: ${count} unseen change${count === 1 ? "" : "s"}`
    : `${count} unseen change${count === 1 ? "" : "s"}`;

  if (dot) {
    return <StatusDot status="accent" size="sm" label={a11y} className={className} />;
  }

  return (
    <Badge
      tone="accent"
      variant="solid"
      size="sm"
      className={className}
      aria-label={a11y}
      data-changed-count={count}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
