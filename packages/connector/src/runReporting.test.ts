import type { RunReport } from "@hermes/contract";
import { LIMITS } from "@hermes/contract";
import { describe, expect, it } from "vitest";
import type { HermesCanvasClient } from "./client";
import { withRunReporting } from "./runReporting";

/** A fake client that records every reportRun call (and can be told to fail). */
function fakeClient(opts: { failOn?: RunReport["status"] } = {}) {
  const calls: { key: string; report: RunReport }[] = [];
  const client = {
    reportRun(key: string, report: RunReport): Promise<{ ok: true }> {
      calls.push({ key, report });
      if (opts.failOn && report.status === opts.failOn) {
        return Promise.reject(new Error(`report ${report.status} rejected`));
      }
      return Promise.resolve({ ok: true });
    },
  } as unknown as HermesCanvasClient;
  return { client, calls };
}

// A deterministic clock: increments by 10ms each read.
function stepClock(start = 1000, step = 10) {
  let t = start;
  return () => {
    const v = t;
    t += step;
    return v;
  };
}

describe("withRunReporting — success lifecycle", () => {
  it("reports started then succeeded, sharing one run_id", async () => {
    const { client, calls } = fakeClient();
    const result = await withRunReporting(
      client,
      "nightly-export",
      async (ctx) => {
        ctx.log("beginning export");
        ctx.setSummary("exported 42 rows");
        return 42;
      },
      { runId: "run_abc", now: stepClock() },
    );

    expect(result).toBe(42);
    expect(calls.map((c) => c.report.status)).toEqual(["started", "succeeded"]);
    expect(calls[0]!.key).toBe("nightly-export");
    expect(calls[0]!.report.run_id).toBe("run_abc");
    expect(calls[1]!.report.run_id).toBe("run_abc");
    expect(calls[1]!.report).toMatchObject({
      summary: "exported 42 rows",
      log_tail: "beginning export",
    });
    expect(calls[1]!.report.finished_at).toBeGreaterThanOrEqual(calls[1]!.report.started_at);
  });

  it("defaults the summary to 'ok' and generates a run_id", async () => {
    const { client, calls } = fakeClient();
    let generated = 0;
    await withRunReporting(client, "job", async () => undefined, {
      generateId: () => `gen_${(generated += 1)}`,
      now: stepClock(),
    });
    expect(calls[0]!.report.run_id).toBe("gen_1");
    expect(calls[1]!.report.summary).toBe("ok");
  });
});

describe("withRunReporting — failure lifecycle", () => {
  it("reports failed with the error message and rethrows", async () => {
    const { client, calls } = fakeClient();
    const boom = new Error("disk full");
    await expect(
      withRunReporting(
        client,
        "job",
        () => {
          throw boom;
        },
        { runId: "run_x", now: stepClock() },
      ),
    ).rejects.toBe(boom);

    expect(calls.map((c) => c.report.status)).toEqual(["started", "failed"]);
    const failed = calls[1]!.report;
    expect(failed.summary).toBe("disk full");
    expect(failed.log_tail).toContain("disk full"); // stack captured into the tail
    expect(failed.finished_at).toBeGreaterThanOrEqual(failed.started_at);
  });
});

describe("withRunReporting — reporting robustness", () => {
  it("surfaces a reporting failure by default (broken reporter is not silent)", async () => {
    const { client } = fakeClient({ failOn: "started" });
    await expect(withRunReporting(client, "job", async () => 1)).rejects.toThrow(
      /report started rejected/,
    );
  });

  it("can soften reporting failures via onReportError without losing the job result", async () => {
    const { client, calls } = fakeClient({ failOn: "succeeded" });
    const seen: string[] = [];
    const result = await withRunReporting(client, "job", async () => "done", {
      now: stepClock(),
      onReportError: (_e, phase) => void seen.push(phase),
    });
    expect(result).toBe("done");
    expect(seen).toEqual(["finish"]);
    expect(calls.map((c) => c.report.status)).toEqual(["started", "succeeded"]);
  });

  it("bounds the log tail to the contract cap", async () => {
    const { client, calls } = fakeClient();
    await withRunReporting(
      client,
      "job",
      async (ctx) => {
        // Write well past the cap in small lines.
        for (let i = 0; i < 5000; i++) ctx.log("x".repeat(100));
      },
      { now: stepClock() },
    );
    const tail = calls[1]!.report.log_tail ?? "";
    expect(Buffer.byteLength(tail, "utf8")).toBeLessThanOrEqual(LIMITS.JOB_LOG_TAIL_BYTES + 32);
    expect(tail).toContain("[truncated]");
  });
});
