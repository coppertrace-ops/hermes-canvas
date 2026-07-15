import { describe, expect, it } from "vitest";
import { AGENT_STALE_AFTER_MS, formatAge, formatBytes, pluralize, staleness } from "./staleness";

/** Pure staleness/formatting helpers — clock-injected, no Date.now. */

const NOW = new Date(2026, 6, 14, 12, 0, 0).getTime();
const S = 1000;
const M = 60 * S;

describe("formatAge", () => {
  it("reads 'just now' under five seconds and for a future (skewed) timestamp", () => {
    expect(formatAge(NOW - 2 * S, NOW)).toBe("just now");
    expect(formatAge(NOW + 10 * S, NOW)).toBe("just now");
  });
  it("steps through seconds, minutes, hours, days", () => {
    expect(formatAge(NOW - 30 * S, NOW)).toBe("30s ago");
    expect(formatAge(NOW - 5 * M, NOW)).toBe("5m ago");
    expect(formatAge(NOW - 3 * 60 * M, NOW)).toBe("3h ago");
    expect(formatAge(NOW - 2 * 24 * 60 * M, NOW)).toBe("2d ago");
  });
});

describe("staleness", () => {
  it("is fresh within the 10-minute window and stale past it", () => {
    const fresh = staleness(NOW - 9 * M, NOW);
    expect(fresh.stale).toBe(false);
    expect(fresh.label).toBe("Reported 9m ago");

    const stale = staleness(NOW - 11 * M, NOW);
    expect(stale.stale).toBe(true);
    expect(stale.label).toBe("Reported 11m ago");
  });
  it("uses exactly the documented threshold", () => {
    expect(staleness(NOW - AGENT_STALE_AFTER_MS, NOW).stale).toBe(false);
    expect(staleness(NOW - AGENT_STALE_AFTER_MS - 1, NOW).stale).toBe(true);
  });
});

describe("formatBytes", () => {
  it("renders B / KiB / MiB on binary boundaries", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(256 * 1024)).toBe("256 KiB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MiB");
  });
  it("keeps one decimal for non-whole units", () => {
    expect(formatBytes(1536)).toBe("1.5 KiB");
  });
});

describe("pluralize", () => {
  it("singular at one, plural otherwise", () => {
    expect(pluralize(1, "entry", "entries")).toBe("1 entry");
    expect(pluralize(0, "entry", "entries")).toBe("0 entries");
    expect(pluralize(3, "memory", "memories")).toBe("3 memories");
  });
});
