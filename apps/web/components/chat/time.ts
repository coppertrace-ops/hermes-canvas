/**
 * Chat time formatting (OWNER: COURIER).
 *
 * Pure, DOM-free helpers that turn a message's `at` (epoch ms) into the strings the
 * transcript renders: a compact clock time shown once per message group, a full
 * timestamp for the hover title, and a day-divider label ("Today" / "Yesterday" /
 * weekday / full date). Kept side-effect-free so grouping and dividers unit-test
 * without a DOM, and so both backends format identically.
 *
 * All formatting is in the viewer's local timezone — a chat timestamp is only
 * meaningful relative to the person reading it.
 */

const MS_PER_MINUTE = 60_000;

/** Local calendar-day key ("YYYY-MM-DD"), the unit day-dividers compare on. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when two epoch-ms instants fall on the same local calendar day. */
export function isSameDay(a: number, b: number): boolean {
  return dayKey(a) === dayKey(b);
}

/** Whole calendar days between two instants (b − a), by local midnight boundaries. */
function calendarDaysBetween(a: number, b: number): number {
  const start = new Date(a);
  start.setHours(0, 0, 0, 0);
  const end = new Date(b);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * MS_PER_MINUTE));
}

/** Compact clock time shown in a group header, e.g. "3:42 PM". */
export function formatMessageTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Full, unambiguous timestamp for the hover `title` (weekday, date, time). */
export function formatExactTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Day-divider label relative to `now`: "Today", "Yesterday", a weekday within the
 * past week, otherwise a full date. `now` is injectable so this stays pure/testable.
 */
export function formatDayDivider(at: number, now: number = Date.now()): string {
  const delta = calendarDaysBetween(at, now);
  if (delta <= 0) return "Today";
  if (delta === 1) return "Yesterday";
  const d = new Date(at);
  if (delta < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(
    undefined,
    sameYear
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" },
  );
}
