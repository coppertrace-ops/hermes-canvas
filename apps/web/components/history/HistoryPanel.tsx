"use client";

import type { ArtifactVersion } from "@hermes/contract";
import { contendedVersions } from "@hermes/diff";
import { Button, cssVar, Panel, Spinner, Text } from "@hermes/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiffView } from "./DiffView";
import type { HtmlPreviewRenderer } from "./HtmlDiffView";
import { MetricsProvider, useReadership } from "./instrumentation";
import { MergePrompt } from "./MergePrompt";
import { RestoreConfirm } from "./RestoreConfirm";
import type { HistoryAdapter, HistoryData } from "./types";
import { VersionTimeline } from "./VersionTimeline";

/**
 * The assembled history surface (plan §3, G4). Left: the version timeline. Right:
 * the diff of the selected write against the base it was written on — so every
 * entry reconstructs exactly what that write changed. Restore and contended-merge
 * flows open in place, both append-only. Readership instrumentation fires on
 * mount (first view), on diff selection, and on restore/merge — the Phase-4
 * deliverable with the same priority as the renderer.
 *
 * Pure UI: it reads a `HistoryData` snapshot and calls `HistoryActions`; the
 * Convex-backed adapter is supplied at integration.
 */

export interface HistoryPanelProps {
  adapter: HistoryAdapter;
  /**
   * Sandbox preview renderer for HTML diffs (Wave 2 P5). Injected by integration
   * (flag-gated); when absent, `HtmlDiffView` shows its honest pending slot.
   */
  renderHtmlPreview?: HtmlPreviewRenderer;
}

export function HistoryPanel({ adapter, renderHtmlPreview }: HistoryPanelProps) {
  return (
    <MetricsProvider value={adapter.metrics ?? { record: () => {} }}>
      <HistoryPanelInner adapter={adapter} renderHtmlPreview={renderHtmlPreview} />
    </MetricsProvider>
  );
}

function HistoryPanelInner({ adapter, renderHtmlPreview }: HistoryPanelProps) {
  const { load, actions } = adapter;

  if (load.status === "loading") {
    return (
      <Panel title="History" className="hc-history-panel">
        <div style={{ display: "flex", gap: cssVar("space-2"), alignItems: "center" }}>
          <Spinner />
          <Text size="sm" tone="tertiary">
            Loading history…
          </Text>
        </div>
      </Panel>
    );
  }
  if (load.status === "error") {
    return (
      <Panel title="History" className="hc-history-panel">
        <Text size="sm" tone="danger">
          {load.message}
        </Text>
        {load.retry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={load.retry}
            style={{ marginTop: cssVar("space-2") }}
          >
            Retry
          </Button>
        )}
      </Panel>
    );
  }
  if (load.status === "empty") {
    return (
      <Panel title="History" className="hc-history-panel">
        <Text size="sm" tone="tertiary">
          No history yet — this artifact has no versions.
        </Text>
      </Panel>
    );
  }

  return <HistoryReady data={load.data} actions={actions} renderHtmlPreview={renderHtmlPreview} />;
}

function HistoryReady({
  data,
  actions,
  renderHtmlPreview,
}: {
  data: HistoryData;
  actions: HistoryAdapter["actions"];
  renderHtmlPreview?: HtmlPreviewRenderer;
}) {
  const readership = useReadership();
  const bySeq = useMemo(
    () => new Map(data.versions.map((v) => [v.seq, v] as const)),
    [data.versions],
  );

  const [selectedSeq, setSelectedSeq] = useState<number>(data.headSeq);
  const [restoreSeq, setRestoreSeq] = useState<number | null>(null);
  const [mergeSeq, setMergeSeq] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const contended = useMemo(() => contendedVersions(data.versions), [data.versions]);

  // First-view instrumentation + mark-seen, once per artifact head.
  const firstViewFired = useRef<string>("");
  useEffect(() => {
    const key = `${data.artifactId}@${data.headSeq}`;
    if (firstViewFired.current === key) return;
    firstViewFired.current = key;
    const head = bySeq.get(data.headSeq);
    readership.artifactFirstViewed({
      artifactId: data.artifactId,
      seq: data.headSeq,
      writeAt: head?.created_at,
    });
    actions.markSeen?.(data.artifactId, data.headSeq);
  }, [data.artifactId, data.headSeq, bySeq, readership, actions]);

  const selected: ArtifactVersion | undefined = bySeq.get(selectedSeq);
  // "Before" = the base this write was written on (parent), so the diff is the
  // exact delta this write introduced. Falls back to the immediate predecessor.
  const before: ArtifactVersion | null = useMemo(() => {
    if (!selected) return null;
    if (selected.parent_seq !== null && bySeq.has(selected.parent_seq))
      return bySeq.get(selected.parent_seq)!;
    if (bySeq.has(selectedSeq - 1)) return bySeq.get(selectedSeq - 1)!;
    return null;
  }, [selected, selectedSeq, bySeq]);

  function selectVersion(seq: number) {
    setSelectedSeq(seq);
    const v = bySeq.get(seq);
    readership.diffOpened({
      artifactId: data.artifactId,
      seq,
      fromSeq: v?.parent_seq ?? undefined,
    });
  }

  async function doRestore(why: string) {
    if (restoreSeq === null) return;
    setBusy(true);
    try {
      await actions.restore(data.artifactId, restoreSeq, why);
      readership.restorePerformed({ artifactId: data.artifactId, seq: restoreSeq });
      setRestoreSeq(null);
    } finally {
      setBusy(false);
    }
  }

  async function doResolveMerge(resolution: string) {
    if (mergeSeq === null) return;
    setBusy(true);
    try {
      await actions.resolveMerge?.(data.artifactId, mergeSeq, resolution);
      readership.mergeResolved({ artifactId: data.artifactId, seq: mergeSeq, resolution });
      setMergeSeq(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="hc-history-panel"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(16rem, 22rem) 1fr",
        gap: cssVar("space-4"),
        minHeight: 0,
      }}
    >
      <Panel title={data.title} variant="default" padding="md" style={{ overflow: "auto" }}>
        {contended.length > 0 && (
          <div style={{ marginBottom: cssVar("space-3") }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const seq = contended[contended.length - 1]!;
                setMergeSeq(seq);
                readership.mergePromptOpened({ artifactId: data.artifactId, seq });
              }}
            >
              {`Reconcile ${contended.length} contended write${contended.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}
        <VersionTimeline
          versions={data.versions}
          headSeq={data.headSeq}
          selectedSeq={selectedSeq}
          comparedSeq={before?.seq}
          onSelect={(entry) => selectVersion(entry.seq)}
        />
      </Panel>

      <Panel
        title={selected ? `Change at v${selected.seq}` : "Select a version"}
        variant="default"
        padding="md"
        style={{ overflow: "auto" }}
        actions={
          selected && selected.seq !== data.headSeq ? (
            <Button size="sm" variant="secondary" onClick={() => setRestoreSeq(selected.seq)}>
              Restore this version
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <DiffView
            type={data.type}
            before={before}
            after={selected}
            renderHtmlPreview={renderHtmlPreview}
          />
        ) : (
          <Text size="sm" tone="tertiary">
            Select a version from the timeline to see what changed.
          </Text>
        )}

        {restoreSeq !== null && (
          <div style={{ marginTop: cssVar("space-4") }}>
            <RestoreConfirm
              versions={data.versions}
              sourceSeq={restoreSeq}
              headSeq={data.headSeq}
              busy={busy}
              onConfirm={doRestore}
              onCancel={() => setRestoreSeq(null)}
            />
          </div>
        )}

        {mergeSeq !== null && (
          <div style={{ marginTop: cssVar("space-4") }}>
            <MergePrompt
              type={data.type}
              versions={data.versions}
              contendedSeq={mergeSeq}
              headSeq={data.headSeq}
              busy={busy}
              onResolve={doResolveMerge}
              onDismiss={() => setMergeSeq(null)}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
