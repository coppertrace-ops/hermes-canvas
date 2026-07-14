import { describe, expect, it } from "vitest";
import { describeCron, estimateIntervalMs, nextRun, parseCron } from "./cron";

/** Cron parse / next-run / describe specs (WP8). Fixed clock inputs — no Date.now. */

// A fixed reference instant: 2026-07-14T12:00:00 local.
const REF = new Date(2026, 6, 14, 12, 0, 0, 0).getTime();

describe("parseCron", () => {
  it("parses the common field forms", () => {
    expect(parseCron("* * * * *")).not.toBeNull();
    expect(parseCron("*/15 * * * *")?.minute.size).toBe(4);
    expect(parseCron("0 9-17 * * *")?.hour.size).toBe(9);
    expect(parseCron("0 0 1,15 * *")?.dom.size).toBe(2);
    expect(parseCron("30 8 * * 1-5")?.dow.size).toBe(5);
  });

  it("accepts dow 7 as Sunday", () => {
    const f = parseCron("0 0 * * 7");
    expect(f?.dow.has(0)).toBe(true);
  });

  it("rejects malformed / out-of-range expressions", () => {
    expect(parseCron("* * * *")).toBeNull(); // 4 fields
    expect(parseCron("60 * * * *")).toBeNull(); // minute 60
    expect(parseCron("* 25 * * *")).toBeNull(); // hour 25
    expect(parseCron("* * * * abc")).toBeNull();
    expect(parseCron("*/0 * * * *")).toBeNull(); // step 0
  });
});

describe("nextRun", () => {
  it("every-15-min lands on the next quarter hour", () => {
    const f = parseCron("*/15 * * * *")!;
    const next = nextRun(f, REF)!;
    // REF is exactly 12:00; exclusive of current minute → 12:15.
    expect(new Date(next).getMinutes()).toBe(15);
    expect(new Date(next).getHours()).toBe(12);
  });

  it("daily-at-time rolls to tomorrow when past", () => {
    const f = parseCron("0 9 * * *")!; // 09:00 daily; REF is 12:00
    const next = nextRun(f, REF)!;
    const d = new Date(next);
    expect(d.getHours()).toBe(9);
    expect(d.getDate()).toBe(15); // next day
  });

  it("weekday cron skips the weekend", () => {
    // 2026-07-18 is a Saturday; a Mon-Fri 08:30 cron from Fri noon → next Monday.
    const friNoon = new Date(2026, 6, 17, 12, 0, 0).getTime(); // Fri
    const f = parseCron("30 8 * * 1-5")!;
    const d = new Date(nextRun(f, friNoon)!);
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
  });
});

describe("estimateIntervalMs", () => {
  it("estimates hourly and 15-min intervals", () => {
    expect(estimateIntervalMs(parseCron("0 * * * *")!, REF)).toBe(60 * 60 * 1000);
    expect(estimateIntervalMs(parseCron("*/15 * * * *")!, REF)).toBe(15 * 60 * 1000);
  });
});

describe("describeCron", () => {
  it("produces human-readable strings, falling back to raw", () => {
    expect(describeCron("* * * * *")).toBe("Every minute");
    expect(describeCron("0 9 * * *")).toBe("Daily at 09:00");
    expect(describeCron("30 8 * * 1-5")).toContain("at 08:30");
    expect(describeCron("weird nonsense here now")).toBe("weird nonsense here now");
  });
});
