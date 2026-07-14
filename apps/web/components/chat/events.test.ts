import type { EventKind, FeedEvent } from "@hermes/contract";
import { describe, expect, it } from "vitest";
import { describeSystemEvent, isSystemLineKind } from "./events";

const event = (over: Partial<FeedEvent>): FeedEvent => ({
  seq: 1,
  kind: "artifact_updated",
  actor: "agent",
  refs: {},
  at: 1000,
  ...over,
});

describe("describeSystemEvent", () => {
  it("names the agent as Hermes and includes artifact + version", () => {
    const s = describeSystemEvent(
      event({ kind: "artifact_updated", refs: { artifact_id: "art_3", version_seq: 12 } }),
    );
    expect(s.summary).toBe("Hermes updated artifact art_3 → v12");
    expect(s.id).toBe("evt_1");
  });

  it("names the human as You", () => {
    const s = describeSystemEvent(
      event({ actor: "human", kind: "artifact_created", refs: { artifact_id: "art_1" } }),
    );
    expect(s.summary).toBe("You created artifact art_1");
  });

  it("surfaces a limit rejection plainly (evidence, not silence)", () => {
    const s = describeSystemEvent(event({ kind: "limit_rejected", actor: "agent" }));
    expect(s.summary.toLowerCase()).toContain("rejected");
  });

  it("carries the raw event fields onto the view model", () => {
    const e = event({ kind: "job_run", refs: { job_key: "nightly" }, at: 5, seq: 9 });
    const s = describeSystemEvent(e);
    expect(s.kind).toBe("job_run");
    expect(s.at).toBe(5);
    expect(s.refs.job_key).toBe("nightly");
  });

  const kinds: EventKind[] = [
    "message",
    "artifact_created",
    "artifact_updated",
    "artifact_archived",
    "tab_changed",
    "job_registered",
    "job_run",
    "auth",
    "limit_rejected",
    "flag_changed",
  ];

  it("produces a non-empty summary for every event kind", () => {
    for (const kind of kinds) {
      const s = describeSystemEvent(event({ kind }));
      expect(s.summary.length).toBeGreaterThan(0);
    }
  });
});

describe("isSystemLineKind", () => {
  it("excludes message events (those are bubbles, not narrations)", () => {
    expect(isSystemLineKind("message")).toBe(false);
    expect(isSystemLineKind("artifact_updated")).toBe(true);
    expect(isSystemLineKind("limit_rejected")).toBe(true);
  });
});
