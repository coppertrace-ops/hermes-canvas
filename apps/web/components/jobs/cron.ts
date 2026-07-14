/**
 * Minimal standard 5-field cron support (PANES; Wave 2 P6 jobs tab, plan §5).
 *
 * The jobs viewer parses cron expressions CLIENT-SIDE for display and next-run —
 * the Canvas is a reporting surface, it never executes cron. Dependency-free (no
 * cron library): supports the common field forms "*", step "/n", value "a",
 * range "a-b", and list "a,b" (and combinations), over the standard fields
 * `minute hour day-of-month month day-of-week`. Anything
 * it can't parse returns null, and the UI falls back to showing the raw
 * expression — an unparseable schedule is surfaced honestly, never hidden.
 *
 * `nextRun` scans minute-by-minute (capped at ~366 days) rather than doing field
 * arithmetic: simpler, provably correct for the supported forms, and fast for
 * real crons (a match is normally within a day/week). DOM-free + pure, so every
 * function is unit-tested with fixed clock inputs.
 */

export interface CronFields {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>; // day of month 1-31
  month: Set<number>; // 1-12
  dow: Set<number>; // day of week 0-6 (0 = Sunday)
  /** True when BOTH dom and dow are restricted (cron OR-semantics apply). */
  domAndDowRestricted: boolean;
  raw: string;
}

const RANGES = {
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  // Day-of-week accepts 0-7 on input; both 0 and 7 mean Sunday (`foldSunday`
  // normalizes 7 → 0 AFTER parsing, so ranges like `0-7` / `1-7` stay intact
  // instead of being string-mangled into an invalid/lossy range).
  dow: [0, 7],
} as const;

function parseField(field: string, [lo, hi]: readonly [number, number]): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    let step = 1;
    let body = part;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      step = Number(part.slice(slash + 1));
      body = part.slice(0, slash);
      if (!Number.isInteger(step) || step <= 0) return null;
    }
    let start = lo;
    let end = hi;
    if (body === "*" || body === "") {
      // full range with optional step
    } else if (body.includes("-")) {
      const [a, b] = body.split("-");
      start = Number(a);
      end = Number(b);
    } else {
      start = end = Number(body);
    }
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (start < lo || end > hi || start > end) return null;
    for (let n = start; n <= end; n += step) out.add(n);
  }
  return out.size > 0 ? out : null;
}

/** Parse a 5-field cron expression. Returns null if any field is unsupported. */
export function parseCron(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minRaw, hrRaw, domRaw, monRaw, dowRaw] = parts as [string, string, string, string, string];
  const minute = parseField(minRaw, RANGES.minute);
  const hour = parseField(hrRaw, RANGES.hour);
  const dom = parseField(domRaw, RANGES.dom);
  const month = parseField(monRaw, RANGES.month);
  const dowParsed = parseField(dowRaw, RANGES.dow);
  if (!minute || !hour || !dom || !month || !dowParsed) return null;
  // Fold 7 → 0 (both are Sunday) once the numeric set is known, so a range that
  // spans 7 (e.g. `0-7`) keeps all its days instead of collapsing.
  const dowSet = new Set([...dowParsed].map((d) => (d === 7 ? 0 : d)));
  return {
    minute,
    hour,
    dom,
    month,
    dow: dowSet,
    domAndDowRestricted: domRaw !== "*" && dowRaw !== "*",
    raw: expr.trim(),
  };
}

function matches(fields: CronFields, d: Date): boolean {
  if (!fields.minute.has(d.getMinutes())) return false;
  if (!fields.hour.has(d.getHours())) return false;
  if (!fields.month.has(d.getMonth() + 1)) return false;
  const domOk = fields.dom.has(d.getDate());
  const dowOk = fields.dow.has(d.getDay());
  // Standard cron: when BOTH dom and dow are restricted, a match on EITHER counts.
  if (fields.domAndDowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

const MINUTE_MS = 60_000;
const SCAN_CAP_MINUTES = 366 * 24 * 60;

/**
 * The next time (epoch ms) at or after `afterMs` (exclusive of the current
 * minute) the cron fires, or null if none within ~366 days (malformed / never).
 */
export function nextRun(fields: CronFields, afterMs: number): number | null {
  // Start at the next whole minute after `afterMs`.
  const start = new Date(Math.floor(afterMs / MINUTE_MS) * MINUTE_MS + MINUTE_MS);
  for (let i = 0; i < SCAN_CAP_MINUTES; i++) {
    const d = new Date(start.getTime() + i * MINUTE_MS);
    if (matches(fields, d)) return d.getTime();
  }
  return null;
}

/** The cron interval estimate (ms) from the gap between the next two firings. */
export function estimateIntervalMs(fields: CronFields, fromMs: number): number | null {
  const a = nextRun(fields, fromMs);
  if (a === null) return null;
  const b = nextRun(fields, a);
  if (b === null) return null;
  return b - a;
}

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A short human-readable description, or the raw expression if unparseable. */
export function describeCron(expr: string): string {
  const f = parseCron(expr);
  if (!f) return expr.trim();
  const everyMinute = f.minute.size === 60;
  const everyHour = f.hour.size === 24;
  const min = [...f.minute].sort((a, b) => a - b);
  const hr = [...f.hour].sort((a, b) => a - b);

  if (everyMinute && everyHour && f.dom.size === 31 && f.dow.size === 7) return "Every minute";
  if (f.minute.size === 1 && everyHour) return `At :${String(min[0]).padStart(2, "0")} every hour`;
  if (f.minute.size === 1 && f.hour.size === 1 && f.dom.size === 31 && f.dow.size === 7) {
    return `Daily at ${String(hr[0]).padStart(2, "0")}:${String(min[0]).padStart(2, "0")}`;
  }
  if (f.minute.size === 1 && f.hour.size === 1 && f.dow.size < 7 && f.dom.size === 31) {
    const days = [...f.dow].sort((a, b) => a - b).map((d) => DOW_NAMES[d]).join(", ");
    return `${days} at ${String(hr[0]).padStart(2, "0")}:${String(min[0]).padStart(2, "0")}`;
  }
  return expr.trim();
}
