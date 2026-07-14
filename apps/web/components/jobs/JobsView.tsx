"use client";

/**
 * Jobs / cron viewer (PANES; Wave 2 P6, plan §5). Pure — driven by `JobView[]` +
 * a `now` clock so it renders identically live and in tests.
 *
 * Per job: human-readable schedule, computed next-run, last-run status, run
 * history with `log_tail`, and OVERDUE detection — a job whose schedule says it
 * should have fired (plus grace) with no report shows a visible "missed / not
 * reporting" state. That is the silent-failure the tab exists to expose. A usage
 * card at the top aggregates the health signal in-product.
 */

import { Badge, cssVar, Panel, Text } from "@hermes/ui";
import type { CSSProperties } from "react";
import { describeCron } from "./cron";
import { evaluateJob, summarizeJobs } from "./overdue";
import type { JobHealth, JobRunView, JobView } from "./overdue";

function fmtTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function healthBadge(health: JobHealth) {
  const map: Record<JobHealth, { tone: "success" | "danger" | "warning" | "neutral" | "accent"; label: string }> = {
    ok: { tone: "success", label: "on schedule" },
    overdue: { tone: "danger", label: "missed / not reporting" },
    "never-run": { tone: "warning", label: "not yet run" },
    unparsable: { tone: "neutral", label: "unparsable schedule" },
    paused: { tone: "neutral", label: "paused" },
  };
  const { tone, label } = map[health];
  return (
    <Badge tone={tone} size="sm" variant="subtle">
      {label}
    </Badge>
  );
}

function runTone(status: JobRunView["status"]): "success" | "danger" | "accent" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  return "accent";
}

const jobCard: CSSProperties = {
  border: `1px solid ${cssVar("border")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-3"),
  background: cssVar("surface"),
  display: "flex",
  flexDirection: "column",
  gap: cssVar("space-2"),
};

const metricTile: CSSProperties = {
  flex: "1 1 0",
  minWidth: "6rem",
  border: `1px solid ${cssVar("border")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-2"),
  background: cssVar("surface-sunken"),
  textAlign: "center",
};

export interface JobsViewProps {
  jobs: JobView[] | undefined;
  /** Injected clock (tests). Defaults to Date.now() at render. */
  now?: number;
}

export function JobsView({ jobs, now: nowProp }: JobsViewProps) {
  const now = nowProp ?? Date.now();

  if (jobs === undefined) {
    return (
      <Panel title="Jobs" className="hc-jobs-panel">
        <Text size="sm" tone="tertiary">
          Loading scheduled jobs…
        </Text>
      </Panel>
    );
  }

  const summary = summarizeJobs(jobs, now);

  return (
    <div className="hc-jobs-panel" style={{ display: "flex", flexDirection: "column", gap: cssVar("space-4") }}>
      <Panel title="Scheduler health" padding="md">
        <div style={{ display: "flex", gap: cssVar("space-2"), flexWrap: "wrap" }}>
          <Metric label="Jobs" value={summary.total} />
          <Metric label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? "danger" : "neutral"} />
          <Metric label="Failing" value={summary.failing} tone={summary.failing > 0 ? "danger" : "neutral"} />
          <Metric label="Paused" value={summary.paused} />
          <Metric label="Runs reported" value={summary.runsReported} />
        </div>
        <Text size="xs" tone="tertiary" style={{ marginTop: cssVar("space-2") }}>
          In-product health signal — a job that stops reporting turns Overdue within its grace window, so a
          silently-dead scheduler is visible here, not hidden.
        </Text>
      </Panel>

      {jobs.length === 0 ? (
        <Panel title="Jobs" padding="md">
          <Text size="sm" tone="tertiary">
            No scheduled jobs registered yet. Hermes registers a job with{" "}
            <code>PUT /agent/jobs/:key</code> and reports each run; they appear here live.
          </Text>
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-3") }}>
          {jobs.map((job) => {
            const h = evaluateJob(job, now);
            return (
              <article key={job.key} style={jobCard} aria-label={`Job: ${job.name}`}>
                <div style={{ display: "flex", alignItems: "baseline", gap: cssVar("space-2"), flexWrap: "wrap" }}>
                  <Text size="sm" weight="semibold">
                    {job.name}
                  </Text>
                  {healthBadge(h.health)}
                  {job.source && (
                    <Text size="xs" tone="tertiary" mono>
                      {job.source}
                    </Text>
                  )}
                </div>
                {job.description && (
                  <Text size="sm" tone="secondary">
                    {job.description}
                  </Text>
                )}
                <div style={{ display: "flex", gap: cssVar("space-4"), flexWrap: "wrap" }}>
                  <Meta label="Schedule" value={describeCron(job.scheduleCron)} mono />
                  <Meta label="Next expected" value={fmtTime(h.nextExpectedRun)} />
                  <Meta
                    label="Last run"
                    value={h.lastRun ? `${fmtTime(h.lastRun.startedAt)} (${h.lastRun.status})` : "never"}
                  />
                </div>
                {job.runs.length > 0 && <RunHistory runs={job.runs} />}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "danger" | "neutral" }) {
  return (
    <div style={metricTile}>
      <Text size="lg" weight="semibold" tone={tone === "danger" ? "danger" : undefined}>
        {String(value)}
      </Text>
      <Text size="xs" tone="tertiary">
        {label}
      </Text>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Text size="xs" tone="tertiary" weight="medium">
        {label}
      </Text>
      <Text size="sm" mono={mono}>
        {value}
      </Text>
    </div>
  );
}

function RunHistory({ runs }: { runs: JobRunView[] }) {
  const ordered = runs.slice().sort((a, b) => b.startedAt - a.startedAt);
  return (
    <details>
      <summary style={{ cursor: "pointer" }}>
        <Text as="span" size="xs" tone="tertiary">
          {`Run history (${runs.length})`}
        </Text>
      </summary>
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-1"), marginTop: cssVar("space-2") }}>
        {ordered.map((run) => (
          <div key={run.runId} style={{ borderTop: `1px solid ${cssVar("border")}`, paddingTop: cssVar("space-1") }}>
            <div style={{ display: "flex", gap: cssVar("space-2"), alignItems: "baseline" }}>
              <Badge tone={runTone(run.status)} size="sm" variant="subtle">
                {run.status}
              </Badge>
              <Text as="span" size="xs" tone="tertiary" mono>
                {fmtTime(run.startedAt)}
                {run.finishedAt ? ` → ${fmtTime(run.finishedAt)}` : ""}
              </Text>
            </div>
            {run.summary && (
              <Text size="xs" tone="secondary">
                {run.summary}
              </Text>
            )}
            {run.logTail && (
              <pre
                style={{
                  margin: `${cssVar("space-1")} 0 0`,
                  padding: cssVar("space-2"),
                  background: cssVar("surface-sunken"),
                  borderRadius: cssVar("radius-sm"),
                  overflow: "auto",
                  maxHeight: "10rem",
                  fontSize: "0.75rem",
                }}
              >
                <code>{run.logTail}</code>
              </pre>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
