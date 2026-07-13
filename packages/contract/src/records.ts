import type { ArtifactStatus, ArtifactType, Author, RenderState } from "./artifact";
import type { EventActor, EventKind, EventRefs } from "./events";
import type { JobStatus, RunStatus } from "./job";
import type { ResolvedAction } from "./resolvedAction";

/**
 * Stored table record shapes — the single source of truth for the Convex schema
 * (plan §3). The Convex `defineTable` calls mirror these field-for-field; keeping
 * the shapes here means the schema and the API types can never disagree.
 *
 * `_id`-style storage ids are Convex-assigned strings; in the in-memory reference
 * core they are minted as stable `art_N` / `tab_N` counters. Either way, identity
 * is stable across a version chain — updates never mint a new artifact id.
 */

export interface ArtifactRecord {
  id: string;
  tab_id?: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  created_by: Author;
  /** Only mutable pointer on the artifact; every other change is a new version. */
  head_seq: number;
  created_at: number;
}

export interface VersionRecord {
  artifact_id: string;
  seq: number;
  /** null for the create version; the claimed base seq otherwise. */
  parent_seq: number | null;
  content: string;
  content_size: number;
  author: Author;
  agent_turn_id?: string;
  why?: string;
  contended: boolean;
  render_state: RenderState;
  resolved_action: ResolvedAction;
  created_at: number;
}

export interface EventRecord {
  /** Global, strictly increasing event seq — the updates-feed cursor. */
  seq: number;
  kind: EventKind;
  actor: EventActor;
  refs: EventRefs;
  at: number;
}

export interface MessageRecord {
  id: string;
  role: "human" | "agent";
  body: string;
  status: "streaming" | "complete";
  turn_id?: string;
  /** The global event seq emitted when this message became visible. */
  event_seq: number;
  at: number;
}

export interface TabRecord {
  id: string;
  title: string;
  order: number;
  status: ArtifactStatus;
  created_at: number;
}

export interface JobRecord {
  key: string;
  name: string;
  schedule_cron: string;
  description: string;
  source: string;
  status: JobStatus;
  updated_at: number;
}

export interface JobRunRecord {
  job_key: string;
  run_id: string;
  status: RunStatus;
  started_at: number;
  finished_at?: number;
  summary?: string;
  log_tail?: string;
}

/** A pending write's timestamp ledger, kept small and windowed for rate limits. */
export interface WriteLedger {
  /** write times per artifact id (all authors). */
  perArtifact: Map<string, number[]>;
  /** agent write times across all artifacts. */
  agentGlobal: number[];
}
