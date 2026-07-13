import { describe, expect, it } from "vitest";
import { InMemoryMetricsSink, isValidMetricsEvent, summarizeReadership } from "./metrics";
import type { MetricsEvent } from "./metrics";

describe("isValidMetricsEvent", () => {
  it("accepts a well-formed event", () => {
    expect(isValidMetricsEvent({ kind: "diff_opened", artifactId: "a1", at: 100 })).toBe(true);
  });
  it("rejects an unknown kind", () => {
    expect(isValidMetricsEvent({ kind: "nope", at: 1 })).toBe(false);
  });
  it("rejects a missing timestamp", () => {
    expect(isValidMetricsEvent({ kind: "diff_opened" })).toBe(false);
  });
  it("rejects a negative time-to-first-view", () => {
    expect(
      isValidMetricsEvent({ kind: "artifact_first_viewed", at: 1, timeToFirstViewMs: -5 }),
    ).toBe(false);
  });
});

describe("InMemoryMetricsSink", () => {
  it("records valid events and drops invalid ones", () => {
    const sink = new InMemoryMetricsSink();
    sink.record({ kind: "diff_opened", artifactId: "a1", at: 1 });
    // @ts-expect-error — deliberately invalid to prove the guard drops it
    sink.record({ kind: "bogus", at: 2 });
    expect(sink.events).toHaveLength(1);
  });
});

describe("summarizeReadership — the kill/keep signal", () => {
  const events: MetricsEvent[] = [
    { kind: "artifact_first_viewed", artifactId: "a1", at: 10, timeToFirstViewMs: 1000 },
    { kind: "artifact_first_viewed", artifactId: "a2", at: 20, timeToFirstViewMs: 3000 },
    { kind: "artifact_first_viewed", artifactId: "a3", at: 30, timeToFirstViewMs: 5000 },
    { kind: "diff_opened", artifactId: "a1", fromSeq: 1, seq: 2, at: 40 },
    { kind: "diff_opened", artifactId: "a1", fromSeq: 2, seq: 3, at: 41 },
    { kind: "badge_clicked", tabId: "t1", at: 50 },
    { kind: "restore_performed", artifactId: "a1", seq: 5, at: 60 },
    { kind: "merge_prompt_opened", artifactId: "a2", at: 70 },
    { kind: "merge_resolved", artifactId: "a2", resolution: "take_contended", at: 71 },
  ];

  it("counts each instrumented action", () => {
    const s = summarizeReadership(events);
    expect(s.diffOpens).toBe(2);
    expect(s.badgeClicks).toBe(1);
    expect(s.restores).toBe(1);
    expect(s.firstViews).toBe(3);
    expect(s.mergePromptsOpened).toBe(1);
    expect(s.mergesResolved).toBe(1);
  });

  it("computes the median time-to-first-view", () => {
    expect(summarizeReadership(events).medianTimeToFirstViewMs).toBe(3000);
  });

  it("counts distinct artifacts (diff-opened vs viewed)", () => {
    const s = summarizeReadership(events);
    expect(s.artifactsWithDiffOpened).toBe(1); // only a1's diff opened
    expect(s.artifactsViewed).toBe(3);
  });

  it("returns null median when no first-views recorded", () => {
    expect(
      summarizeReadership([{ kind: "badge_clicked", at: 1 }]).medianTimeToFirstViewMs,
    ).toBeNull();
  });
});
