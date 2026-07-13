import type { WriteResult } from "./api";
import type { Author } from "./artifact";
import type { CreateArtifact, UpdateArtifact } from "./api";
import type { Edit } from "./edit";
import { CanvasError } from "./errors";
import type { EventActor, EventKind, EventRefs } from "./events";
import { regionResolvedAction, resolveRegionEdit } from "./region";
import { evaluateRateLimit } from "./ratelimit";
import type { ArtifactRecord, EventRecord, VersionRecord } from "./records";
import type { ResolvedAction } from "./resolvedAction";
import { FIRST_SEQ, planSeq } from "./sequencer";
import { validateContent } from "./validate";

/**
 * Pure write-plan composition (plan §2.2–§3).
 *
 * Each `plan*` function takes plain data (the current artifact snapshot, the
 * parent content, recent-write timestamps, a minted id, a clock reading) and
 * returns a WritePlan describing EXACTLY the rows to append and the pointer to
 * move. It performs no I/O. Both the in-memory reference core and the Convex
 * mutations gather these inputs from their store and apply the identical plan —
 * so the sequencer/contention/validation/rate-limit rules have one home.
 *
 * Rejections throw CanvasError. Callers are responsible for recording the
 * `limit_rejected` event (see `rejectionEvent`) so a blocked write is evidence,
 * not silence.
 */

/** An event to append; its global seq is assigned by the store on apply. */
export type PlannedEvent = Omit<EventRecord, "seq">;

export interface WritePlan {
  /** New artifact to insert (create only). */
  newArtifact?: ArtifactRecord;
  /** Version row to append (absent for archive, which changes no content). */
  version?: VersionRecord;
  /** New head_seq to set on the artifact (absent when head is unchanged). */
  newHeadSeq?: number;
  /** Status change to apply to the artifact (archive). */
  statusChange?: "active" | "archived";
  /** Events to append transactionally with the write. */
  events: PlannedEvent[];
  /** The structured result returned to the caller. */
  result: WriteResult;
}

function actorOf(author: Author): EventActor {
  return author === "agent" ? "agent" : "human";
}

/** Build the `limit_rejected` event a caller records when a write is refused. */
export function rejectionEvent(err: CanvasError, author: Author, refs: EventRefs, at: number): PlannedEvent {
  return {
    kind: "limit_rejected",
    actor: actorOf(author),
    refs: { ...refs },
    at,
  };
}

function rateLimit(
  now: number,
  author: Author,
  recentArtifactWrites: readonly number[],
  recentGlobalWrites: readonly number[],
): void {
  evaluateRateLimit(now, recentArtifactWrites, author === "agent" ? recentGlobalWrites : []);
}

// ---------------------------------------------------------------------------

export interface CreateInputs {
  artifactId: string;
  input: CreateArtifact;
  author: Author;
  agentTurnId?: string;
  now: number;
  recentArtifactWrites: readonly number[];
  recentGlobalWrites: readonly number[];
}

export function planCreateArtifact(i: CreateInputs): WritePlan {
  rateLimit(i.now, i.author, i.recentArtifactWrites, i.recentGlobalWrites);
  const { render_state, content_size } = validateContent(i.input.type, i.input.content);

  const resolved_action: ResolvedAction = { op: "create", target: i.artifactId };
  const version: VersionRecord = {
    artifact_id: i.artifactId,
    seq: FIRST_SEQ,
    parent_seq: null,
    content: i.input.content,
    content_size,
    author: i.author,
    agent_turn_id: i.agentTurnId,
    why: i.input.why,
    contended: false,
    render_state,
    resolved_action,
    created_at: i.now,
  };
  const newArtifact: ArtifactRecord = {
    id: i.artifactId,
    tab_id: i.input.tab_id,
    type: i.input.type,
    title: i.input.title,
    status: "active",
    created_by: i.author,
    head_seq: FIRST_SEQ,
    created_at: i.now,
  };
  const events: PlannedEvent[] = [
    {
      kind: "artifact_created" satisfies EventKind,
      actor: actorOf(i.author),
      refs: { artifact_id: i.artifactId, version_seq: FIRST_SEQ, tab_id: i.input.tab_id },
      at: i.now,
    },
  ];
  return {
    newArtifact,
    version,
    events,
    result: {
      artifact_id: i.artifactId,
      head_seq: FIRST_SEQ,
      seq: FIRST_SEQ,
      contended: false,
      render_state,
      resolved_action,
    },
  };
}

// ---------------------------------------------------------------------------

export interface UpdateInputs {
  artifact: ArtifactRecord;
  /** Content of the version identified by input.parent_seq (region base). */
  parentContent: string;
  input: UpdateArtifact;
  author: Author;
  agentTurnId?: string;
  now: number;
  recentArtifactWrites: readonly number[];
  recentGlobalWrites: readonly number[];
}

/** Resolve an edit to a full snapshot + resolved_action, without I/O. */
function applyEdit(artifactId: string, parentContent: string, edit: Edit): { content: string; resolved: ResolvedAction } {
  if (edit.mode === "replace_all") {
    return { content: edit.content, resolved: { op: "replace_all", target: artifactId } };
  }
  const res = resolveRegionEdit(parentContent, edit.anchor, edit.content);
  return { content: res.content, resolved: regionResolvedAction(artifactId, res) };
}

export function planUpdateArtifact(i: UpdateInputs): WritePlan {
  if (i.artifact.status === "archived") {
    throw CanvasError.archived(i.artifact.id);
  }
  rateLimit(i.now, i.author, i.recentArtifactWrites, i.recentGlobalWrites);

  const { content, resolved } = applyEdit(i.artifact.id, i.parentContent, i.input.edit);
  const { render_state, content_size } = validateContent(i.artifact.type, content);

  const seqPlan = planSeq(i.artifact.head_seq, i.input.parent_seq);
  const version: VersionRecord = {
    artifact_id: i.artifact.id,
    seq: seqPlan.seq,
    parent_seq: i.input.parent_seq,
    content,
    content_size,
    author: i.author,
    agent_turn_id: i.agentTurnId,
    why: i.input.why,
    contended: seqPlan.contended,
    render_state,
    resolved_action: resolved,
    created_at: i.now,
  };
  const events: PlannedEvent[] = [
    {
      kind: "artifact_updated",
      actor: actorOf(i.author),
      refs: { artifact_id: i.artifact.id, version_seq: seqPlan.seq },
      at: i.now,
    },
  ];
  return {
    version,
    newHeadSeq: seqPlan.seq,
    events,
    result: {
      artifact_id: i.artifact.id,
      head_seq: seqPlan.seq,
      seq: seqPlan.seq,
      contended: seqPlan.contended,
      render_state,
      resolved_action: resolved,
    },
  };
}

// ---------------------------------------------------------------------------

export interface RestoreInputs {
  artifact: ArtifactRecord;
  /** Content of the seq being restored. */
  sourceContent: string;
  sourceSeq: number;
  why: string;
  author: Author;
  agentTurnId?: string;
  now: number;
  recentArtifactWrites: readonly number[];
  recentGlobalWrites: readonly number[];
}

/** Restore = a NEW version whose content equals an old one (plan §3). Appends. */
export function planRestoreArtifact(i: RestoreInputs): WritePlan {
  if (i.artifact.status === "archived") {
    throw CanvasError.archived(i.artifact.id);
  }
  rateLimit(i.now, i.author, i.recentArtifactWrites, i.recentGlobalWrites);
  const { render_state, content_size } = validateContent(i.artifact.type, i.sourceContent);

  const seqPlan = planSeq(i.artifact.head_seq, i.artifact.head_seq);
  const resolved_action: ResolvedAction = {
    op: "restore",
    target: i.artifact.id,
    restored_from_seq: i.sourceSeq,
  };
  const version: VersionRecord = {
    artifact_id: i.artifact.id,
    seq: seqPlan.seq,
    parent_seq: i.artifact.head_seq,
    content: i.sourceContent,
    content_size,
    author: i.author,
    agent_turn_id: i.agentTurnId,
    why: i.why,
    contended: false,
    render_state,
    resolved_action,
    created_at: i.now,
  };
  const events: PlannedEvent[] = [
    {
      kind: "artifact_updated",
      actor: actorOf(i.author),
      refs: { artifact_id: i.artifact.id, version_seq: seqPlan.seq },
      at: i.now,
    },
  ];
  return {
    version,
    newHeadSeq: seqPlan.seq,
    events,
    result: {
      artifact_id: i.artifact.id,
      head_seq: seqPlan.seq,
      seq: seqPlan.seq,
      contended: false,
      render_state,
      resolved_action,
    },
  };
}

// ---------------------------------------------------------------------------

export interface ArchiveInputs {
  artifact: ArtifactRecord;
  why: string;
  author: Author;
  now: number;
}

/** Soft-archive (reversible). Status change + event; no content version. */
export function planArchiveArtifact(i: ArchiveInputs): WritePlan {
  const resolved_action: ResolvedAction = { op: "archive", target: i.artifact.id };
  const events: PlannedEvent[] = [
    {
      kind: "artifact_archived",
      actor: actorOf(i.author),
      refs: { artifact_id: i.artifact.id, version_seq: i.artifact.head_seq },
      at: i.now,
    },
  ];
  return {
    statusChange: "archived",
    events,
    result: {
      artifact_id: i.artifact.id,
      head_seq: i.artifact.head_seq,
      seq: i.artifact.head_seq,
      contended: false,
      render_state: "ok",
      resolved_action,
    },
  };
}
