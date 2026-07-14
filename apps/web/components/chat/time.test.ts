import { describe, expect, it } from "vitest";
import { dayKey, formatDayDivider, isSameDay } from "./time";

/** A local-time instant, built so tests are independent of the runner's timezone. */
function at(y: number, mo: number, d: number, h = 12): number {
  return new Date(y, mo - 1, d, h, 0, 0, 0).getTime();
}

describe("time helpers", () => {
  it("dayKey collapses instants on the same local day", () => {
    expect(dayKey(at(2026, 7, 13, 0))).toBe(dayKey(at(2026, 7, 13, 23)));
    expect(dayKey(at(2026, 7, 13))).not.toBe(dayKey(at(2026, 7, 14)));
  });

  it("isSameDay agrees with dayKey", () => {
    expect(isSameDay(at(2026, 7, 13, 1), at(2026, 7, 13, 22))).toBe(true);
    expect(isSameDay(at(2026, 7, 13), at(2026, 7, 12))).toBe(false);
  });

  it("labels today and yesterday relative to now", () => {
    const now = at(2026, 7, 13);
    expect(formatDayDivider(at(2026, 7, 13, 9), now)).toBe("Today");
    expect(formatDayDivider(at(2026, 7, 12, 9), now)).toBe("Yesterday");
  });

  it("labels a day earlier this week by weekday and older days by date", () => {
    const now = at(2026, 7, 13); // a Monday
    // Three days back is still within the week → weekday name.
    expect(formatDayDivider(at(2026, 7, 10), now)).toMatch(/day$/);
    // Two weeks back → a full date, not a weekday.
    const older = formatDayDivider(at(2026, 6, 20), now);
    expect(older).not.toMatch(/day$/);
    expect(older).toMatch(/June|Jun/);
  });
});
