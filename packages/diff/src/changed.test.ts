import { describe, expect, it } from "vitest";
import {
  aggregateTabChanged,
  artifactBadge,
  artifactChanged,
  isArtifactChanged,
  nextLastSeen,
  shouldMarkSeen,
  tabBadge,
  totalChanged,
  SEEN_DWELL_MS,
} from "./changed";
import type { HasHead, LastSeenMap } from "./changed";

describe("isArtifactChanged", () => {
  it("is true when head advanced past last_seen", () => {
    expect(isArtifactChanged(5, 3)).toBe(true);
  });
  it("is false when last_seen covers the head", () => {
    expect(isArtifactChanged(5, 5)).toBe(false);
  });
  it("treats a never-seen artifact (undefined) as changed", () => {
    expect(isArtifactChanged(1, undefined)).toBe(true);
  });
});

/**
 * G4: "badges set on agent write, cleared on view, aggregate to tab dots." This
 * models the full lifecycle: an agent write bumps head_seq (badge on), marking
 * seen advances last_seen to head (badge off).
 */
describe("changed-since lifecycle — set on write, cleared on view", () => {
  const artifacts: HasHead[] = [
    { id: "a1", tabId: "t1", headSeq: 4 },
    { id: "a2", tabId: "t1", headSeq: 2 },
    { id: "a3", tabId: "t2", headSeq: 7 },
  ];

  it("shows badges after an agent write bumps head past last_seen", () => {
    const seen: LastSeenMap = { a1: 3, a2: 2, a3: 0 };
    expect(artifactChanged(artifacts[0]!, seen)).toBe(true); // 4 > 3
    expect(artifactChanged(artifacts[1]!, seen)).toBe(false); // 2 == 2
    expect(artifactChanged(artifacts[2]!, seen)).toBe(true); // 7 > 0
  });

  it("aggregates changed artifacts per tab", () => {
    const seen: LastSeenMap = { a1: 3, a2: 2, a3: 0 };
    const agg = aggregateTabChanged(artifacts, seen);
    expect(agg.t1).toBe(1); // only a1 changed
    expect(agg.t2).toBe(1); // a3 changed
    expect(totalChanged(artifacts, seen)).toBe(2);
  });

  it("CLEARS the badge once the artifact is marked seen (last_seen := head)", () => {
    const before: LastSeenMap = { a1: 3 };
    expect(artifactChanged(artifacts[0]!, before)).toBe(true);
    // Marking seen advances last_seen to the head.
    const advanced = nextLastSeen(before.a1, artifacts[0]!.headSeq);
    expect(advanced).toBe(4);
    // a2 was already seen at its head (2); advancing a1 clears the whole t1 tab.
    const after: LastSeenMap = { a1: advanced!, a2: 2 };
    expect(artifactChanged(artifacts[0]!, after)).toBe(false);
    expect(tabBadge("t1", artifacts, after).count).toBe(0);
  });

  it("badge model reduces a single artifact to count 1/0", () => {
    expect(artifactBadge(artifacts[0]!, { a1: 3 }).count).toBe(1);
    expect(artifactBadge(artifacts[0]!, { a1: 4 }).count).toBe(0);
  });
});

describe("nextLastSeen — monotonic (never regresses)", () => {
  it("advances to head when head is newer", () => {
    expect(nextLastSeen(3, 5)).toBe(5);
  });
  it("returns null (no write) when already covered", () => {
    expect(nextLastSeen(5, 5)).toBeNull();
    expect(nextLastSeen(9, 5)).toBeNull();
  });
  it("does not un-see newer versions if an old seq is viewed", () => {
    // last_seen is 9; viewing content at head 5 must not lower it.
    expect(nextLastSeen(9, 5)).toBeNull();
  });
});

describe("shouldMarkSeen — plan §3 rule", () => {
  it("marks immediately when the diff is opened", () => {
    expect(shouldMarkSeen({ openedDiff: true, dwellMs: 0 })).toBe(true);
  });
  it("marks after the dwell threshold on focus", () => {
    expect(shouldMarkSeen({ dwellMs: SEEN_DWELL_MS })).toBe(true);
    expect(shouldMarkSeen({ dwellMs: SEEN_DWELL_MS - 1 })).toBe(false);
  });
});
