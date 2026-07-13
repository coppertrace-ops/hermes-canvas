"use client";

import type { ArtifactType, ArtifactVersion, ResolvedAction } from "@hermes/contract";
import { InMemoryMetricsSink } from "@hermes/diff";
import { scriptedSession } from "@hermes/diff/fixtures";
import { useMemo, useState } from "react";
import type { HistoryAdapter, HistoryData } from "./types";

/**
 * In-memory history adapter (OWNER: CHRONICLE) — the seam's mock, mirroring
 * COURIER's `mockBackend` / PANES' mock adapter. It drives the components in
 * tests and stories with the scripted 20-write G4 session, and — crucially — it
 * implements restore/merge as REAL append-only writes against its own state, so
 * the demo proves the append-only guarantee live: the head advances, prior
 * versions never change. No backend is faked; integration swaps this for a Convex
 * adapter and the render tree is unchanged.
 */

export interface MockHistoryOptions {
  artifactId?: string;
  type?: ArtifactType;
  title?: string;
  /** Provide your own version chain; defaults to the scripted 20-write session. */
  versions?: ArtifactVersion[];
  headSeq?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

/** Build a `HistoryData` from a version chain. */
export function buildHistoryData(opts: MockHistoryOptions = {}): HistoryData {
  const session = scriptedSession();
  const versions = opts.versions ?? session.versions;
  const headSeq = opts.headSeq ?? versions.reduce((m, v) => Math.max(m, v.seq), 0);
  return {
    artifactId: opts.artifactId ?? "art_1",
    type: opts.type ?? "markdown",
    title: opts.title ?? "Design notes",
    versions,
    headSeq,
  };
}

function appendVersion(
  versions: ArtifactVersion[],
  sourceSeq: number,
  op: ResolvedAction["op"],
  why: string,
  now: number,
): ArtifactVersion[] {
  const head = versions.reduce((m, v) => Math.max(m, v.seq), 0);
  const source = versions.find((v) => v.seq === sourceSeq);
  if (!source) return versions;
  const next: ArtifactVersion = {
    artifact_id: source.artifact_id,
    seq: head + 1,
    parent_seq: head,
    content: source.content,
    content_size: source.content.length,
    author: "human",
    why,
    contended: false,
    render_state: "ok",
    resolved_action: { op, target: source.artifact_id, restored_from_seq: sourceSeq },
    created_at: now,
  };
  // Append-only: existing versions are copied unchanged.
  return [...versions, next];
}

export interface MockHistory {
  adapter: HistoryAdapter;
  sink: InMemoryMetricsSink;
  /** Current version chain (grows on restore/merge — never mutated in place). */
  versions: ArtifactVersion[];
}

/**
 * React hook exposing a live mock adapter. Restore and merge-resolution append a
 * new head to local state, re-rendering the panel — the visible proof that
 * restore is append-only.
 */
export function useMockHistoryAdapter(options: MockHistoryOptions = {}): MockHistory {
  const now = options.now ?? Date.now;
  const initial = useMemo(() => buildHistoryData(options).versions, [options]);
  const [versions, setVersions] = useState<ArtifactVersion[]>(initial);
  const sink = useMemo(() => new InMemoryMetricsSink(), []);

  const base = useMemo(() => buildHistoryData(options), [options]);
  const headSeq = versions.reduce((m, v) => Math.max(m, v.seq), 0);

  const adapter: HistoryAdapter = {
    load: { status: "ready", data: { ...base, versions, headSeq } },
    metrics: sink,
    actions: {
      restore: (_artifactId, seq, why) => {
        setVersions((vs) => appendVersion(vs, seq, "restore", why, now()));
      },
      resolveMerge: (_artifactId, contendedSeq, resolution) => {
        if (resolution === "take_contended") {
          setVersions((vs) =>
            appendVersion(vs, contendedSeq, "restore", `take contended v${contendedSeq}`, now()),
          );
        }
        // keep_head / manual are no-ops in the mock (a real adapter records them).
      },
      markSeen: () => {},
    },
  };

  return { adapter, sink, versions };
}
