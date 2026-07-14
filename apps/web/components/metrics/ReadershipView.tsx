"use client";

/**
 * ReadershipView (OWNER: PROOF integration) — the presentational readership-test
 * report.
 *
 * The 4-week readership test decides whether the versioning UX earns continued
 * investment (plan §7, §10 risk 4). Its kill/keep signal — badge clicks, diff
 * opens, restores, time-to-first-view — was recorded by `metrics.recordEvent` but
 * had ZERO readers: write-only telemetry nobody could see. This is the owner's
 * read surface for it.
 *
 * Pure and data-driven: it takes a `ReadershipSummary | undefined` and renders,
 * so it unit-tests without Convex. `undefined` is the loading frame; an all-zero
 * summary is an honest "no readership data yet" empty state (never a wall of
 * zeros dressed up as insight). `ReadershipPanel` is the thin live-query wrapper.
 */

import type { ReadershipSummary } from "@hermes/diff";
import { Panel, Spinner, Text } from "@hermes/ui";
import type { CSSProperties } from "react";

export interface ReadershipViewProps {
  /** The summary; `undefined` while the live query loads. */
  summary: ReadershipSummary | undefined;
}

/** True when the summary carries no engagement at all (the empty-state trigger). */
export function isEmptyReadership(s: ReadershipSummary): boolean {
  return (
    s.diffOpens === 0 &&
    s.badgeClicks === 0 &&
    s.restores === 0 &&
    s.firstViews === 0 &&
    s.mergePromptsOpened === 0 &&
    s.mergesResolved === 0
  );
}

/** Format a median latency (ms) as a compact human string, or an em dash when null. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds >= 10 ? Math.round(seconds) : Math.round(seconds * 10) / 10} s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds - minutes * 60);
  return `${minutes}m ${rem}s`;
}

interface Stat {
  label: string;
  value: string;
  /** Optional context line under the number (e.g. distinct-artifact counts). */
  hint?: string;
}

function statsFor(s: ReadershipSummary): Stat[] {
  return [
    { label: "Diff opens", value: String(s.diffOpens), hint: `${s.artifactsWithDiffOpened} artifact${s.artifactsWithDiffOpened === 1 ? "" : "s"}` },
    { label: "Badge clicks", value: String(s.badgeClicks) },
    { label: "First views", value: String(s.firstViews), hint: `${s.artifactsViewed} artifact${s.artifactsViewed === 1 ? "" : "s"}` },
    { label: "Median time to first view", value: formatDuration(s.medianTimeToFirstViewMs) },
    { label: "Restores", value: String(s.restores) },
    { label: "Merge prompts", value: String(s.mergePromptsOpened), hint: `${s.mergesResolved} resolved` },
  ];
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
  gap: "var(--hc-space-3)",
};

const tile: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--hc-space-1)",
  padding: "var(--hc-space-3)",
  borderRadius: "var(--hc-radius-md)",
  background: "var(--hc-surface-2)",
  border: "var(--hc-border-width) solid var(--hc-border)",
};

function StatTile({ stat }: { stat: Stat }) {
  return (
    <div style={tile}>
      <Text as="div" size="2xl" weight="semibold" style={{ lineHeight: "var(--hc-line-tight)" }}>
        {stat.value}
      </Text>
      <Text as="div" size="xs" tone="tertiary">
        {stat.label}
      </Text>
      {stat.hint && (
        <Text as="div" size="xs" tone="tertiary">
          {stat.hint}
        </Text>
      )}
    </div>
  );
}

export function ReadershipView({ summary }: ReadershipViewProps) {
  if (summary === undefined) {
    return (
      <Panel title="Readership" className="hc-readership-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--hc-space-2)" }}>
          <Spinner />
          <Text size="sm" tone="tertiary">
            Loading readership…
          </Text>
        </div>
      </Panel>
    );
  }

  if (isEmptyReadership(summary)) {
    return (
      <Panel title="Readership" className="hc-readership-panel">
        <Text size="sm" tone="tertiary">
          No readership data yet — badge clicks, diff opens, and first views appear here as you
          work with versioned artifacts.
        </Text>
      </Panel>
    );
  }

  return (
    <Panel title="Readership" className="hc-readership-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--hc-space-3)" }}>
        <Text size="xs" tone="tertiary">
          Engagement with versioned artifacts — the kill/keep signal for the versioning UX.
        </Text>
        <div style={grid}>
          {statsFor(summary).map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
