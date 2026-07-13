import type {
  ArchiveArtifact,
  ArtifactRead,
  ArtifactSummary,
  CreateArtifact,
  PostMessage,
  UpdateArtifact,
  UpdatesResponse,
  WriteResult,
} from "./api";
import type { Author } from "./artifact";
import { CanvasError } from "./errors";
import type { EventRefs } from "./events";
import type { JobRegistration, RunReport } from "./job";
import { byteLength, LIMITS } from "./limits";
import {
  planArchiveArtifact,
  planCreateArtifact,
  planRestoreArtifact,
  planUpdateArtifact,
  rejectionEvent,
  type PlannedEvent,
  type WritePlan,
} from "./plan";
import type {
  ArtifactRecord,
  EventRecord,
  JobRecord,
  JobRunRecord,
  MessageRecord,
  TabRecord,
  VersionRecord,
  WriteLedger,
} from "./records";
import type { CreateTab, PatchTab } from "./tab";

/**
 * In-memory reference implementation of the Canvas core (plan §2–§3).
 *
 * This is the authoritative, deployment-free semantics: it applies the exact
 * pure plans from `plan.ts` with append-only storage, so the Gate G1 behaviours
 * can be proven in Vitest without a Convex login. The Convex mutations mirror
 * this class method-for-method against `ctx.db`; any divergence is a bug in the
 * mutation, not here.
 *
 * Append-only enforcement is real, not aspirational: every stored version and
 * event is `Object.freeze`d, and no method ever indexes-and-assigns into the
 * `versions` / `events` arrays — they only grow.
 */
export interface CanvasCoreOptions {
  /** Injectable clock so tests can drive rate-limit windows deterministically. */
  now?: () => number;
}

export class CanvasCore {
  private readonly artifacts = new Map<string, ArtifactRecord>();
  private readonly versions: VersionRecord[] = [];
  private readonly events: EventRecord[] = [];
  private readonly messages: MessageRecord[] = [];
  private readonly tabs = new Map<string, TabRecord>();
  private readonly jobs = new Map<string, JobRecord>();
  private readonly jobRuns: JobRunRecord[] = [];
  private readonly ledger: WriteLedger = { perArtifact: new Map(), agentGlobal: [] };
  private readonly streams = new Map<string, string>();

  private eventSeq = 0;
  private artifactCounter = 0;
  private tabCounter = 0;
  private messageCounter = 0;

  private readonly clock: () => number;

  constructor(opts: CanvasCoreOptions = {}) {
    this.clock = opts.now ?? Date.now;
  }

  // --- id minting (stable identity) -------------------------------------

  private nextArtifactId(): string {
    this.artifactCounter += 1;
    return `art_${this.artifactCounter}`;
  }
  private nextTabId(): string {
    this.tabCounter += 1;
    return `tab_${this.tabCounter}`;
  }
  private nextMessageId(): string {
    this.messageCounter += 1;
    return `msg_${this.messageCounter}`;
  }

  // --- append-only primitives -------------------------------------------

  private appendEvent(e: PlannedEvent): EventRecord {
    this.eventSeq += 1;
    const rec: EventRecord = Object.freeze({ ...e, seq: this.eventSeq });
    this.events.push(rec);
    return rec;
  }

  private appendVersion(v: VersionRecord): void {
    this.versions.push(Object.freeze({ ...v }));
  }

  private recordWrite(artifactId: string, author: Author, at: number): void {
    const arr = this.ledger.perArtifact.get(artifactId) ?? [];
    arr.push(at);
    this.ledger.perArtifact.set(artifactId, arr);
    if (author === "agent") this.ledger.agentGlobal.push(at);
  }

  private recentArtifactWrites(artifactId: string): number[] {
    return this.ledger.perArtifact.get(artifactId) ?? [];
  }

  /**
   * Apply a validated plan atomically, recording the write in the rate ledger.
   * Mirrors the single Convex mutation that inserts version + events + head move.
   */
  private applyPlan(plan: WritePlan, author: Author): WriteResult {
    if (plan.newArtifact) this.artifacts.set(plan.newArtifact.id, { ...plan.newArtifact });
    const artifactId = plan.result.artifact_id;
    const art = this.artifacts.get(artifactId);
    if (art) {
      if (plan.newHeadSeq !== undefined) art.head_seq = plan.newHeadSeq;
      if (plan.statusChange !== undefined) art.status = plan.statusChange;
    }
    if (plan.version) this.appendVersion(plan.version);
    for (const e of plan.events) this.appendEvent(e);
    if (plan.version) this.recordWrite(artifactId, author, plan.version.created_at);
    return plan.result;
  }

  /**
   * Run a write plan, guaranteeing that a rejection still records a
   * `limit_rejected` event (a blocked write is evidence, not silence — plan §3).
   */
  private runWrite(author: Author, refs: EventRefs, build: () => WritePlan): WriteResult {
    let plan: WritePlan;
    try {
      plan = build();
    } catch (err) {
      if (err instanceof CanvasError) {
        this.appendEvent(rejectionEvent(err, author, refs, this.clock()));
      }
      throw err;
    }
    return this.applyPlan(plan, author);
  }

  private requireArtifact(id: string): ArtifactRecord {
    const a = this.artifacts.get(id);
    if (!a) throw CanvasError.notFound(`artifact ${id}`);
    return a;
  }

  private findVersion(artifactId: string, seq: number): VersionRecord | undefined {
    return this.versions.find((v) => v.artifact_id === artifactId && v.seq === seq);
  }

  // --- artifact writes ---------------------------------------------------

  createArtifact(input: CreateArtifact, author: Author = "agent", agentTurnId?: string): WriteResult {
    const artifactId = this.nextArtifactId();
    const now = this.clock();
    return this.runWrite(author, { artifact_id: artifactId, tab_id: input.tab_id }, () =>
      planCreateArtifact({
        artifactId,
        input,
        author,
        agentTurnId,
        now,
        recentArtifactWrites: this.recentArtifactWrites(artifactId),
        recentGlobalWrites: this.ledger.agentGlobal,
      }),
    );
  }

  updateArtifact(id: string, input: UpdateArtifact, author: Author = "agent", agentTurnId?: string): WriteResult {
    const artifact = this.requireArtifact(id);
    const now = this.clock();
    // Region edits resolve against the exact parent the writer claims to have read.
    let parentContent = "";
    if (input.edit.mode === "region") {
      const parent = this.findVersion(id, input.parent_seq);
      if (!parent) {
        // Record the rejection as evidence, then throw.
        return this.runWrite(author, { artifact_id: id }, () => {
          throw CanvasError.validation(`parent_seq ${input.parent_seq} not found for artifact ${id}`);
        });
      }
      parentContent = parent.content;
    }
    return this.runWrite(author, { artifact_id: id }, () =>
      planUpdateArtifact({
        artifact,
        parentContent,
        input,
        author,
        agentTurnId,
        now,
        recentArtifactWrites: this.recentArtifactWrites(id),
        recentGlobalWrites: this.ledger.agentGlobal,
      }),
    );
  }

  restoreArtifact(id: string, sourceSeq: number, why: string, author: Author = "human"): WriteResult {
    const artifact = this.requireArtifact(id);
    const source = this.findVersion(id, sourceSeq);
    if (!source) throw CanvasError.notFound(`version ${sourceSeq} of artifact ${id}`);
    const now = this.clock();
    return this.runWrite(author, { artifact_id: id, version_seq: sourceSeq }, () =>
      planRestoreArtifact({
        artifact,
        sourceContent: source.content,
        sourceSeq,
        why,
        author,
        now,
        recentArtifactWrites: this.recentArtifactWrites(id),
        recentGlobalWrites: this.ledger.agentGlobal,
      }),
    );
  }

  archiveArtifact(id: string, input: ArchiveArtifact, author: Author = "agent"): WriteResult {
    const artifact = this.requireArtifact(id);
    const now = this.clock();
    return this.runWrite(author, { artifact_id: id }, () =>
      planArchiveArtifact({ artifact, why: input.why, author, now }),
    );
  }

  // --- tabs --------------------------------------------------------------

  createTab(input: CreateTab): TabRecord {
    const id = this.nextTabId();
    const now = this.clock();
    const order = input.order ?? this.tabs.size;
    const rec: TabRecord = { id, title: input.title, order, status: "active", created_at: now };
    this.tabs.set(id, rec);
    this.appendEvent({ kind: "tab_changed", actor: "agent", refs: { tab_id: id }, at: now });
    return rec;
  }

  patchTab(id: string, patch: PatchTab): TabRecord {
    const tab = this.tabs.get(id);
    if (!tab) throw CanvasError.notFound(`tab ${id}`);
    if (patch.title !== undefined) tab.title = patch.title;
    if (patch.order !== undefined) tab.order = patch.order;
    if (patch.status !== undefined) tab.status = patch.status;
    this.appendEvent({ kind: "tab_changed", actor: "agent", refs: { tab_id: id }, at: this.clock() });
    return tab;
  }

  // --- jobs --------------------------------------------------------------

  registerJob(key: string, reg: JobRegistration): JobRecord {
    const now = this.clock();
    const rec: JobRecord = {
      key,
      name: reg.name,
      schedule_cron: reg.schedule_cron,
      description: reg.description,
      source: reg.source,
      status: reg.status,
      updated_at: now,
    };
    this.jobs.set(key, rec);
    this.appendEvent({ kind: "job_registered", actor: "agent", refs: { job_key: key }, at: now });
    return rec;
  }

  reportRun(key: string, report: RunReport): JobRunRecord {
    if (!this.jobs.has(key)) throw CanvasError.notFound(`job ${key}`);
    const rec: JobRunRecord = { job_key: key, ...report };
    this.jobRuns.push(rec);
    this.appendEvent({ kind: "job_run", actor: "agent", refs: { job_key: key }, at: this.clock() });
    return rec;
  }

  // --- messages ----------------------------------------------------------

  postMessage(input: PostMessage, role: "human" | "agent" = "agent", turnId?: string): MessageRecord {
    const now = this.clock();
    if ("text" in input) {
      if (byteLength(input.text) > LIMITS.MESSAGE_BYTES) {
        throw CanvasError.oversize({
          limit: "MESSAGE_BYTES",
          limit_value: LIMITS.MESSAGE_BYTES,
          actual: byteLength(input.text),
          unit: "bytes",
        });
      }
      const evt = this.appendEvent({ kind: "message", actor: role, refs: {}, at: now });
      const rec: MessageRecord = {
        id: this.nextMessageId(),
        role,
        body: input.text,
        status: "complete",
        turn_id: turnId,
        event_seq: evt.seq,
        at: now,
      };
      this.messages.push(rec);
      return rec;
    }
    // Streaming: accumulate deltas keyed by stream_id.
    const existingId = this.streams.get(input.stream_id);
    let rec = existingId ? this.messages.find((m) => m.id === existingId) : undefined;
    if (!rec) {
      const evt = this.appendEvent({ kind: "message", actor: role, refs: {}, at: now });
      rec = {
        id: this.nextMessageId(),
        role,
        body: "",
        status: "streaming",
        turn_id: turnId,
        event_seq: evt.seq,
        at: now,
      };
      this.messages.push(rec);
      this.streams.set(input.stream_id, rec.id);
    }
    const nextBody = rec.body + input.delta;
    if (byteLength(nextBody) > LIMITS.MESSAGE_BYTES) {
      throw CanvasError.oversize({
        limit: "MESSAGE_BYTES",
        limit_value: LIMITS.MESSAGE_BYTES,
        actual: byteLength(nextBody),
        unit: "bytes",
      });
    }
    rec.body = nextBody;
    if (input.done) {
      rec.status = "complete";
      this.streams.delete(input.stream_id);
    }
    return rec;
  }

  // --- reads -------------------------------------------------------------

  private summaryOf(a: ArtifactRecord): ArtifactSummary {
    return {
      artifact_id: a.id,
      tab_id: a.tab_id,
      type: a.type,
      title: a.title,
      status: a.status,
      head_seq: a.head_seq,
    };
  }

  listArtifacts(): ArtifactSummary[] {
    return [...this.artifacts.values()].map((a) => this.summaryOf(a));
  }

  readArtifact(id: string, seq?: number): ArtifactRead {
    const a = this.requireArtifact(id);
    const wantSeq = seq ?? a.head_seq;
    const v = this.findVersion(id, wantSeq);
    if (!v) throw CanvasError.notFound(`version ${wantSeq} of artifact ${id}`);
    return {
      artifact: this.summaryOf(a),
      version: {
        artifact_id: v.artifact_id,
        seq: v.seq,
        parent_seq: v.parent_seq,
        content: v.content,
        content_size: v.content_size,
        author: v.author,
        why: v.why,
        contended: v.contended,
        render_state: v.render_state,
        resolved_action: v.resolved_action,
        created_at: v.created_at,
      },
    };
  }

  /** Updates feed (poll fallback for the WS subscription). */
  getUpdates(cursor = 0): UpdatesResponse {
    const events = this.events.filter((e) => e.seq > cursor);
    const messages = this.messages
      .filter((m) => m.event_seq > cursor)
      .map((m) => ({ message_id: m.id, role: m.role, body: m.body, status: m.status, at: m.at }));
    return {
      cursor: this.eventSeq,
      messages,
      events: events.map((e) => ({ seq: e.seq, kind: e.kind, actor: e.actor, refs: e.refs, at: e.at })),
    };
  }

  /** Work Hermes should react to: human messages + events since the cursor. */
  pendingWork(cursor = 0): UpdatesResponse {
    const base = this.getUpdates(cursor);
    return { ...base, messages: base.messages.filter((m) => m.role === "human") };
  }

  // --- test / inspection accessors (read-only copies) -------------------

  getVersions(artifactId?: string): readonly VersionRecord[] {
    const v = artifactId ? this.versions.filter((x) => x.artifact_id === artifactId) : this.versions;
    return v.map((x) => x);
  }
  getEvents(): readonly EventRecord[] {
    return this.events.map((x) => x);
  }
  getJobRuns(key?: string): readonly JobRunRecord[] {
    return this.jobRuns.filter((r) => key === undefined || r.job_key === key);
  }
  getTab(id: string): TabRecord | undefined {
    return this.tabs.get(id);
  }
  getJob(key: string): JobRecord | undefined {
    return this.jobs.get(key);
  }

  /** A stable fingerprint of the append-only history, to prove it never rewrites. */
  historyFingerprint(): string {
    return JSON.stringify(
      this.versions.map((v) => [v.artifact_id, v.seq, v.parent_seq, v.content_size, v.resolved_action.op]),
    );
  }
}
