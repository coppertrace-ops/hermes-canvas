/**
 * `withRunReporting` — the ready-made job wrapper the plan promises (OWNER:
 * LEDGER, plan §5).
 *
 * The Canvas is a scheduled job's *reporting surface*, not its scheduler. A
 * Hermes host registers a job once (`client.registerJob`) and then wraps the
 * job body in `withRunReporting`, which posts a run record at start and again at
 * completion — the "two lines in a job wrapper" §5 describes. Every run gets a
 * stable `run_id`, so start and finish upsert the SAME run row.
 *
 * Failure is reported, never swallowed: if the job throws, a `failed` run is
 * posted (with the error message as summary and a bounded log tail) BEFORE the
 * error propagates. A dead job that looks healthy is exactly the silent-failure
 * class this product exists to expose, so the wrapper's own reporting errors are
 * surfaced too (see `onReportError`).
 */

import { byteLength, LIMITS, type RunReport } from "@hermes/contract";
import type { HermesCanvasClient } from "./client";

/** Handed to the job body so it can enrich the run report as it works. */
export interface RunContext {
  /** The run id start and finish reports share. */
  readonly runId: string;
  /** Append a line to the captured log tail (bounded to the contract cap). */
  log(line: string): void;
  /** Set the run's one-line summary (overrides the default). */
  setSummary(summary: string): void;
}

export interface RunReportingOptions {
  /** Stable run id; generated (UUID) when omitted. */
  runId?: string;
  /** Injectable clock (epoch millis). Defaults to `Date.now`. */
  now?: () => number;
  /** Injectable id generator. Defaults to `crypto.randomUUID`. */
  generateId?: () => string;
  /**
   * Called if posting a run record itself fails. Default RETHROWS — a broken
   * reporter must not masquerade as a healthy job. Pass a no-op to soften.
   */
  onReportError?: (error: unknown, phase: "start" | "finish") => void;
}

/** Cap for the running summary before it is sent (title-sized, generous). */
const SUMMARY_MAX = 2000;

/** Bounded, append-only log buffer capped at the contract's log-tail byte cap. */
class LogTail {
  private parts: string[] = [];
  private bytes = 0;
  private truncated = false;

  append(line: string): void {
    const chunk = (this.parts.length === 0 ? "" : "\n") + line;
    const size = byteLength(chunk);
    if (this.bytes + size > LIMITS.JOB_LOG_TAIL_BYTES) {
      this.truncated = true;
      return;
    }
    this.parts.push(line);
    this.bytes += size;
  }

  value(): string | undefined {
    if (this.parts.length === 0) return undefined;
    const body = this.parts.join("\n");
    return this.truncated ? body + "\n…[truncated]" : body;
  }
}

function defaultGenerateId(): string {
  return crypto.randomUUID();
}

/** Trim a summary to a safe length without throwing on the contract cap. */
function clampSummary(summary: string): string {
  return summary.length <= SUMMARY_MAX ? summary : summary.slice(0, SUMMARY_MAX - 1) + "…";
}

/**
 * Run `fn` while reporting its lifecycle to the Canvas. Reports `started`
 * before the body runs and `succeeded`/`failed` after. Returns the body's
 * result; rethrows its error (after the `failed` report lands).
 */
export async function withRunReporting<T>(
  client: HermesCanvasClient,
  key: string,
  fn: (ctx: RunContext) => T | Promise<T>,
  options: RunReportingOptions = {},
): Promise<T> {
  const now = options.now ?? (() => Date.now());
  const generateId = options.generateId ?? defaultGenerateId;
  const onReportError =
    options.onReportError ??
    ((error, phase): void => {
      throw error instanceof Error
        ? error
        : new Error(`run report (${phase}) failed: ${String(error)}`);
    });

  const runId = options.runId ?? generateId();
  const startedAt = now();
  const tail = new LogTail();
  let summary: string | undefined;

  const ctx: RunContext = {
    runId,
    log: (line) => tail.append(line),
    setSummary: (s) => {
      summary = clampSummary(s);
    },
  };

  const report = async (report: RunReport, phase: "start" | "finish"): Promise<void> => {
    try {
      await client.reportRun(key, report);
    } catch (error) {
      onReportError(error, phase);
    }
  };

  await report({ run_id: runId, status: "started", started_at: startedAt }, "start");

  let result: T;
  try {
    result = await fn(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.stack) tail.append(error.stack);
    await report(
      {
        run_id: runId,
        status: "failed",
        started_at: startedAt,
        finished_at: now(),
        summary: clampSummary(summary ?? message),
        log_tail: tail.value(),
      },
      "finish",
    );
    throw error;
  }

  await report(
    {
      run_id: runId,
      status: "succeeded",
      started_at: startedAt,
      finished_at: now(),
      summary: summary ?? "ok",
      log_tail: tail.value(),
    },
    "finish",
  );
  return result;
}
