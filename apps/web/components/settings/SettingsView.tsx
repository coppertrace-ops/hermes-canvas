"use client";

/**
 * Settings view (PROOF integration, Wave 2) — the pure, presentational half.
 *
 * Three stacked sections on one scrollable page (matching the app's density —
 * JobsView stacks Panels the same way):
 *   1. Agent    — read-only "what am I talking to" status, with a staleness line.
 *   2. Memory   — a read-only viewer over synced memory entries (no edit/delete).
 *   3. Workspace — feature-flag toggles, theme, and the limits reference table.
 *
 * It takes fully-resolved view models + callbacks and holds NO Convex calls, so it
 * renders identically live and under `renderToStaticMarkup` in tests. The live
 * wiring (queries, debounce, mutations) lives in `SettingsPanel`.
 */

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Badge, Button, cssVar, EmptyState, Input, Panel, StatusDot, Text, ThemeToggle } from "@hermes/ui";
import type { FlagKey, FlagState } from "@hermes/contract";
import { formatBytes, pluralize, staleness } from "./staleness";
import { Switch } from "./Switch";

// --- View models (camelCase mirrors of the frozen api.settings.* DTOs) -------

export interface AgentStatus {
  model: string;
  provider: string;
  effort?: string;
  fallbacks?: string[];
  context?: { usedTokens?: number; maxTokens?: number };
  gateway?: { version?: string; uptimeS?: number };
  toolsets?: string[];
  platforms?: string[];
  sessionsActive?: number;
  memory?: { provider?: string; recallBudget?: number };
  reportedAt: number;
}

export interface MemoryEntry {
  entryId: string;
  content: string;
  tags?: string[];
  source?: string;
  createdAt?: number;
  updatedAt?: number;
  syncedAt: number;
}

export interface WorkspaceInfo {
  limits: Partial<Record<string, number>>;
  deployment?: Record<string, unknown>;
  appVersion?: string;
}

/** Plain-language copy for each flag toggle (the "what does this do" line). */
const FLAG_COPY: Record<FlagKey, { title: string; description: string }> = {
  html_artifacts: {
    title: "HTML artifacts",
    description: "Render HTML artifacts and their diffs in a sandboxed preview frame.",
  },
  boards: {
    title: "Boards",
    description: "Enable structured board artifacts and owner board edits on the canvas.",
  },
  jobs_tab: {
    title: "Jobs tab",
    description: "Show the scheduled-jobs health view in the top navigation.",
  },
};

/** Presentation for the limits reference table — label + how to format the value. */
const LIMIT_ROWS: { key: string; label: string; kind: "bytes" | "chars" | "count" | "ms" }[] = [
  { key: "VERSION_CONTENT_BYTES", label: "Artifact version size", kind: "bytes" },
  { key: "ATTACHMENT_BYTES", label: "Attachment size", kind: "bytes" },
  { key: "MESSAGE_BYTES", label: "Chat message size", kind: "bytes" },
  { key: "JOB_LOG_TAIL_BYTES", label: "Job log tail", kind: "bytes" },
  { key: "WHY_MAX_CHARS", label: "Justification length", kind: "chars" },
  { key: "TITLE_MAX_CHARS", label: "Title length", kind: "chars" },
  { key: "WRITES_PER_MIN_PER_ARTIFACT", label: "Writes / min per artifact", kind: "count" },
  { key: "AGENT_WRITES_PER_MIN_GLOBAL", label: "Agent writes / min (global)", kind: "count" },
  { key: "MESSAGE_COALESCE_MS", label: "Message coalesce cadence", kind: "ms" },
  { key: "RATE_WINDOW_MS", label: "Rate-limit window", kind: "ms" },
];

function formatLimit(value: number, kind: "bytes" | "chars" | "count" | "ms"): string {
  switch (kind) {
    case "bytes":
      return formatBytes(value);
    case "chars":
      return `${value.toLocaleString()} chars`;
    case "ms":
      return value >= 1000 ? `${value / 1000}s` : `${value} ms`;
    case "count":
      return value.toLocaleString();
  }
}

// --- Layout tokens (inline, cssVar — the JobsView convention) ----------------

const section: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: cssVar("space-4"),
};

const chipRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: cssVar("space-2"),
  alignItems: "center",
};

const fieldGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
  gap: cssVar("space-4"),
};

export interface SettingsViewProps {
  /** `undefined` = loading, `null` = the connector hasn't reported yet. */
  agent: AgentStatus | null | undefined;
  memories: MemoryEntry[] | undefined;
  memorySearch: string;
  onMemorySearchChange: (value: string) => void;
  workspace: WorkspaceInfo | undefined;
  flags: FlagState;
  onToggleFlag: (key: FlagKey, enabled: boolean) => void;
  /** Keys whose toggle mutation is in flight (disables + shows busy). */
  flagPending?: Partial<Record<FlagKey, boolean>>;
  /** Injected clock (tests). Defaults to Date.now() at render. */
  now?: number;
}

export function SettingsView({
  agent,
  memories,
  memorySearch,
  onMemorySearchChange,
  workspace,
  flags,
  onToggleFlag,
  flagPending,
  now: nowProp,
}: SettingsViewProps) {
  const now = nowProp ?? Date.now();
  return (
    <div style={section} aria-label="Settings">
      <AgentSection agent={agent} now={now} />
      <MemorySection
        memories={memories}
        search={memorySearch}
        onSearchChange={onMemorySearchChange}
        now={now}
      />
      <WorkspaceSection
        workspace={workspace}
        flags={flags}
        onToggleFlag={onToggleFlag}
        flagPending={flagPending}
      />
    </div>
  );
}

// --- 1. Agent ----------------------------------------------------------------

function AgentSection({ agent, now }: { agent: AgentStatus | null | undefined; now: number }) {
  if (agent === undefined) {
    return (
      <Panel title="Agent" padding="md">
        <Text size="sm" tone="tertiary">
          Loading agent status…
        </Text>
      </Panel>
    );
  }

  if (agent === null) {
    return (
      <Panel title="Agent" padding="md">
        <EmptyState
          title="Agent hasn't reported yet"
          description="Status arrives once the connector's status reporter is installed and posts its first heartbeat."
        />
      </Panel>
    );
  }

  const st = staleness(agent.reportedAt, now);
  const ctx = agent.context;
  const hasCtx = typeof ctx?.usedTokens === "number" && typeof ctx?.maxTokens === "number" && ctx.maxTokens > 0;

  return (
    <Panel title="Agent" padding="md">
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-4") }}>
        {/* What am I talking to — model + provider, prominent. */}
        <div style={{ display: "flex", alignItems: "baseline", gap: cssVar("space-2"), flexWrap: "wrap" }}>
          <Text size="lg" weight="semibold">
            {agent.model}
          </Text>
          <Text size="sm" tone="secondary">
            {agent.provider}
          </Text>
          {agent.effort && (
            <Badge tone="accent" variant="subtle" size="sm">
              {agent.effort} effort
            </Badge>
          )}
        </div>

        {/* Staleness — turns to a warning tone past 10 min (jobs overdue pattern). */}
        <div style={{ display: "flex", alignItems: "center", gap: cssVar("space-2") }}>
          <StatusDot status={st.stale ? "warning" : "success"} label={st.stale ? "Status stale" : "Status fresh"} />
          <Text size="xs" tone={st.stale ? "danger" : "tertiary"}>
            {st.label}
          </Text>
          {st.stale && (
            <Badge tone="warning" variant="subtle" size="sm">
              stale — reporter may be down
            </Badge>
          )}
        </div>

        {/* Context usage meter (honest "not reported" otherwise). */}
        <Field label="Context usage">
          {hasCtx ? (
            <ContextMeter used={ctx!.usedTokens!} max={ctx!.maxTokens!} />
          ) : (
            <Text size="sm" tone="tertiary">
              Not reported
            </Text>
          )}
        </Field>

        <div style={fieldGrid}>
          <Field label="Gateway">
            <Text size="sm">
              {agent.gateway?.version ? `v${agent.gateway.version}` : "—"}
              {typeof agent.gateway?.uptimeS === "number" ? ` · up ${formatUptime(agent.gateway.uptimeS)}` : ""}
            </Text>
          </Field>
          <Field label="Active sessions">
            <Text size="sm">{typeof agent.sessionsActive === "number" ? String(agent.sessionsActive) : "—"}</Text>
          </Field>
          <Field label="Memory">
            <Text size="sm">
              {agent.memory?.provider ?? "—"}
              {typeof agent.memory?.recallBudget === "number" ? ` · recall ${agent.memory.recallBudget}` : ""}
            </Text>
          </Field>
        </div>

        <Field label="Fallbacks">
          {agent.fallbacks && agent.fallbacks.length > 0 ? (
            <div style={chipRow}>
              {agent.fallbacks.map((f) => (
                <Badge key={f} tone="neutral" variant="outline" size="sm">
                  {f}
                </Badge>
              ))}
            </div>
          ) : (
            <Text size="sm" tone="tertiary">
              None reported
            </Text>
          )}
        </Field>

        <ChipField label="Toolsets" values={agent.toolsets} empty="No toolsets reported" />
        <ChipField label="Platforms" values={agent.platforms} empty="No platforms reported" />
      </div>
    </Panel>
  );
}

function ContextMeter({ used, max }: { used: number; max: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((used / max) * 100)));
  const tone = pct >= 90 ? "danger" : pct >= 75 ? "warning" : "accent";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-1") }}>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Context usage ${pct}%`}
        style={{
          height: 6,
          borderRadius: cssVar("radius-full"),
          background: cssVar("surface-sunken"),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: cssVar(tone),
            borderRadius: cssVar("radius-full"),
          }}
        />
      </div>
      <Text size="xs" tone="tertiary">
        {`${used.toLocaleString()} / ${max.toLocaleString()} tokens (${pct}%)`}
      </Text>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// --- 2. Memory ---------------------------------------------------------------

function MemorySection({
  memories,
  search,
  onSearchChange,
  now,
}: {
  memories: MemoryEntry[] | undefined;
  search: string;
  onSearchChange: (v: string) => void;
  now: number;
}) {
  const searching = search.trim().length > 0;
  return (
    <Panel
      title="Memory"
      padding="md"
      actions={
        memories !== undefined ? (
          <Text size="xs" tone="tertiary">
            {pluralize(memories.length, "entry", "entries")}
          </Text>
        ) : undefined
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-3") }}>
        <Text size="xs" tone="tertiary">
          A read-only view of the agent's synced long-term memory. Entries are written by the agent; this
          viewer never edits or deletes them.
        </Text>
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search memories…"
          aria-label="Search memories"
        />

        {memories === undefined ? (
          <Text size="sm" tone="tertiary">
            Loading memories…
          </Text>
        ) : memories.length === 0 ? (
          <EmptyState
            size="sm"
            title={searching ? "No matching memories" : "No memories synced yet"}
            description={
              searching
                ? "No entries match your search. Try a different term."
                : "The agent hasn't written any memory entries, or none have synced to this workspace yet."
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-2") }}>
            {memories.map((m) => (
              <MemoryRow key={m.entryId} entry={m} now={now} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

const memCard: CSSProperties = {
  border: `1px solid ${cssVar("border")}`,
  borderRadius: cssVar("radius-md"),
  padding: cssVar("space-3"),
  background: cssVar("surface"),
  display: "flex",
  flexDirection: "column",
  gap: cssVar("space-2"),
};

const clampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 4,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-wrap",
};

function MemoryRow({ entry, now }: { entry: MemoryEntry; now: number }) {
  const [expanded, setExpanded] = useState(false);
  // Only offer expand when the content is long enough to plausibly clamp.
  const clampable = entry.content.length > 240 || entry.content.split("\n").length > 4;
  const when = entry.updatedAt ?? entry.createdAt ?? entry.syncedAt;
  return (
    <article style={memCard} aria-label="Memory entry">
      <Text size="sm" style={expanded || !clampable ? { whiteSpace: "pre-wrap" } : clampStyle}>
        {entry.content}
      </Text>
      {clampable && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} style={{ alignSelf: "flex-start" }}>
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
      {entry.tags && entry.tags.length > 0 && (
        <div style={chipRow}>
          {entry.tags.map((t) => (
            <Badge key={t} tone="neutral" variant="subtle" size="sm">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: cssVar("space-2"), flexWrap: "wrap" }}>
        {entry.source && (
          <Text size="xs" tone="tertiary" mono>
            {entry.source}
          </Text>
        )}
        <Text size="xs" tone="tertiary">
          {formatWhen(when, now)}
        </Text>
      </div>
    </article>
  );
}

function formatWhen(ms: number, now: number): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- 3. Workspace ------------------------------------------------------------

function WorkspaceSection({
  workspace,
  flags,
  onToggleFlag,
  flagPending,
}: {
  workspace: WorkspaceInfo | undefined;
  flags: FlagState;
  onToggleFlag: (key: FlagKey, enabled: boolean) => void;
  flagPending?: Partial<Record<FlagKey, boolean>>;
}) {
  const flagKeys = Object.keys(FLAG_COPY) as FlagKey[];
  return (
    <Panel title="Workspace" padding="md">
      <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-6") }}>
        {/* Feature flags */}
        <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-3") }}>
          <div>
            <Text size="sm" weight="semibold">
              Feature flags
            </Text>
            <Text size="xs" tone="tertiary">
              Changes apply live to every session — no redeploy.
            </Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-2") }}>
            {flagKeys.map((key) => (
              <FlagToggle
                key={key}
                flagKey={key}
                enabled={flags[key]}
                pending={flagPending?.[key] ?? false}
                onToggle={onToggleFlag}
              />
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: cssVar("space-3") }}>
          <div>
            <Text size="sm" weight="semibold">
              Theme
            </Text>
            <Text size="xs" tone="tertiary">
              Light, dark, or follow the system.
            </Text>
          </div>
          <ThemeToggle />
        </div>

        {/* Limits reference */}
        <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-2") }}>
          <Text size="sm" weight="semibold">
            Limits
          </Text>
          <LimitsTable limits={workspace?.limits} />
        </div>

        {/* App / deployment */}
        <Text size="xs" tone="tertiary">
          {workspace === undefined
            ? "Loading workspace info…"
            : formatDeploymentLine(workspace)}
        </Text>
      </div>
    </Panel>
  );
}

const rowBetween: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: cssVar("space-4"),
  padding: `${cssVar("space-2")} 0`,
  borderTop: `1px solid ${cssVar("border")}`,
};

function FlagToggle({
  flagKey,
  enabled,
  pending,
  onToggle,
}: {
  flagKey: FlagKey;
  enabled: boolean;
  pending: boolean;
  onToggle: (key: FlagKey, enabled: boolean) => void;
}) {
  const copy = FLAG_COPY[flagKey];
  return (
    <div style={rowBetween}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Text size="sm" weight="medium">
          {copy.title}
        </Text>
        <Text size="xs" tone="tertiary">
          {copy.description}
        </Text>
      </div>
      <Switch
        checked={enabled}
        disabled={pending}
        label={copy.title}
        onChange={(next) => onToggle(flagKey, next)}
      />
    </div>
  );
}

const limitsTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: cssVar("font-size-sm"),
};

function LimitsTable({ limits }: { limits: Partial<Record<string, number>> | undefined }) {
  if (limits === undefined) {
    return (
      <Text size="sm" tone="tertiary">
        Loading limits…
      </Text>
    );
  }
  const rows = LIMIT_ROWS.filter((r) => typeof limits[r.key] === "number");
  if (rows.length === 0) {
    return (
      <Text size="sm" tone="tertiary">
        No limits reported.
      </Text>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={limitsTable}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ padding: `${cssVar("space-1")} ${cssVar("space-2")} ${cssVar("space-1")} 0`, color: cssVar("text-secondary") }}>
                {r.label}
              </td>
              <td style={{ padding: `${cssVar("space-1")} 0`, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatLimit(limits[r.key]!, r.kind)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDeploymentLine(workspace: WorkspaceInfo): string {
  const parts: string[] = [];
  if (workspace.appVersion) parts.push(`App ${workspace.appVersion}`);
  const dep = workspace.deployment;
  if (dep) {
    for (const k of ["name", "convex_url", "url", "cloud"]) {
      const v = dep[k];
      if (typeof v === "string" && v.length > 0) parts.push(v);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "Deployment details not reported.";
}

// --- Small shared helpers ----------------------------------------------------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cssVar("space-1") }}>
      <Text size="xs" tone="tertiary" weight="medium">
        {label}
      </Text>
      {children}
    </div>
  );
}

function ChipField({ label, values, empty }: { label: string; values?: string[]; empty: string }) {
  return (
    <Field label={label}>
      {values && values.length > 0 ? (
        <div style={chipRow}>
          {values.map((v) => (
            <Badge key={v} tone="neutral" variant="subtle" size="sm">
              {v}
            </Badge>
          ))}
        </div>
      ) : (
        <Text size="sm" tone="tertiary">
          {empty}
        </Text>
      )}
    </Field>
  );
}
