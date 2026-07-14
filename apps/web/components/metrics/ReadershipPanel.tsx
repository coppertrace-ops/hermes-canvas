"use client";

/**
 * ReadershipPanel (OWNER: PROOF integration) — the live wrapper around
 * {@link ReadershipView}.
 *
 * Subscribes to the owner-guarded `metrics.readershipSummary` query so the report
 * updates live as telemetry lands. Must be mounted under a Convex provider (it is:
 * only `LiveWorkspace` renders it). All rendering — including the loading and
 * empty frames — lives in the pure `ReadershipView`; this file is data only.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReadershipView } from "./ReadershipView";

export function ReadershipPanel() {
  // `undefined` until the first snapshot; `ReadershipView` renders that as loading.
  const summary = useQuery(api.metrics.readershipSummary, {});
  return <ReadershipView summary={summary} />;
}
