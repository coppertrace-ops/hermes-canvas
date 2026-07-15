"use client";

/**
 * ToolCallRow + ToolCallCluster (OWNER: COURIER) — live tool-call telemetry.
 *
 * A compact, quiet row between message bubbles: a command glyph, the tool name,
 * a single-line monospace argument summary, and a live state cell — a spinner
 * while running, then a check + duration on success or a cross + tone on
 * error/blocked. The row edits in place as the completion receipt arrives (same
 * tool_call_id), so a call never stacks two rows.
 *
 * Anti-noise: a busy turn's completed calls collapse into a `ToolCallCluster`
 * ("N tool calls") that expands on demand; the running/most-recent call always
 * stays visible (see `layoutTimeline`). A receipt whose session differs from the
 * visible-window majority carries a small "subagent" chip.
 *
 * Accessibility: the expand affordance is a real <button> (Enter/Space), so
 * keyboard users toggle detail; only the terminal-state transition is announced
 * (a `role="status"` node that mounts on completion), never every live update.
 * The running spinner is `@hermes/ui`'s, which honours reduced-motion by slowing,
 * never hiding.
 */

import { Badge, Spinner, Text } from "@hermes/ui";
import type { StatusTone } from "@hermes/ui";
import { memo, useState } from "react";
import type { CSSProperties } from "react";
import { describeToolStatus, formatToolDuration, isSubagentCall } from "./toolCalls";
import type { ToolCall } from "./types";

/** CSS color token for a status tone (glyph + accents). */
function toneColor(tone: StatusTone): string {
  switch (tone) {
    case "success":
      return "var(--hc-success)";
    case "danger":
      return "var(--hc-danger)";
    case "warning":
      return "var(--hc-warning)";
    default:
      return "var(--hc-text-tertiary)";
  }
}

/** A terminal-state glyph (▪ running never reaches here; spinner shows instead). */
function statusGlyph(status: ToolCall["status"]): string {
  switch (status) {
    case "ok":
      return "✓";
    case "error":
      return "✕";
    case "blocked":
      return "⊘";
    default:
      return "";
  }
}

const CommandIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M5 7l5 5-5 5" />
    <path d="M13 17h6" />
  </svg>
);

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hc-space-2)",
  width: "100%",
  padding: "var(--hc-space-1) var(--hc-space-2)",
  borderRadius: "var(--hc-radius-md)",
  background: "transparent",
  border: "none",
  textAlign: "left",
  color: "var(--hc-text-secondary)",
  cursor: "default",
  font: "inherit",
};

const argsStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "var(--hc-font-mono)",
  fontSize: "var(--hc-font-size-xs)",
  color: "var(--hc-text-tertiary)",
};

const detailStyle: CSSProperties = {
  margin: "var(--hc-space-1) 0 0 var(--hc-space-5)",
  padding: "var(--hc-space-2)",
  borderRadius: "var(--hc-radius-md)",
  background: "var(--hc-surface-2)",
  fontFamily: "var(--hc-font-mono)",
  fontSize: "var(--hc-font-size-xs)",
  color: "var(--hc-text-secondary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowX: "auto",
  maxHeight: "14rem",
  overflowY: "auto",
};

/** Visually-hidden but present for assistive tech. */
const srOnly: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export interface ToolCallRowProps {
  toolCall: ToolCall;
  /** Session shared by the visible window's majority; drives the subagent chip. */
  majoritySessionId?: string;
}

function StateCell({ toolCall }: { toolCall: ToolCall }) {
  const { tone, label } = describeToolStatus(toolCall.status);
  if (toolCall.status === "running") {
    return <Spinner label={`${toolCall.tool} running`} />;
  }
  const duration = formatToolDuration(toolCall.durationMs);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--hc-space-1)" }}>
      <span aria-hidden style={{ color: toneColor(tone), fontWeight: 600 }}>
        {statusGlyph(toolCall.status)}
      </span>
      {duration && (
        <Text size="xs" tone="tertiary" mono>
          {duration}
        </Text>
      )}
      {/* Announced once, on mount at completion — not on every live update. */}
      <span role="status" style={srOnly}>
        {`${toolCall.tool} ${label.toLowerCase()}${duration ? ` in ${duration}` : ""}`}
      </span>
    </span>
  );
}

function ToolCallRowImpl({ toolCall, majoritySessionId }: ToolCallRowProps) {
  const detail =
    toolCall.status === "error" || toolCall.status === "blocked"
      ? toolCall.errorMessage
      : toolCall.resultTail;
  const expandable = Boolean(detail);
  const [open, setOpen] = useState(false);
  const subagent = isSubagentCall(toolCall, majoritySessionId);
  const { tone } = describeToolStatus(toolCall.status);

  const inner = (
    <>
      <span aria-hidden style={{ color: toneColor(tone), display: "inline-flex" }}>
        <CommandIcon />
      </span>
      <Text size="sm" weight="medium" mono>
        {toolCall.tool}
      </Text>
      {toolCall.argsSummary && (
        <span style={argsStyle} title={toolCall.argsSummary}>
          {toolCall.argsSummary}
        </span>
      )}
      {!toolCall.argsSummary && <span style={{ flex: 1 }} />}
      {subagent && (
        <Badge size="sm" tone="info" variant="subtle">
          subagent
        </Badge>
      )}
      <StateCell toolCall={toolCall} />
      {expandable && (
        <span aria-hidden style={{ color: "var(--hc-text-tertiary)", fontSize: "var(--hc-font-size-xs)" }}>
          {open ? "▾" : "▸"}
        </span>
      )}
    </>
  );

  return (
    <div data-kind="tool" data-status={toolCall.status}>
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ ...rowStyle, cursor: "pointer" }}
        >
          {inner}
        </button>
      ) : (
        <div style={rowStyle}>{inner}</div>
      )}
      {expandable && open && (
        <div style={detailStyle} data-kind="tool-detail">
          {detail}
        </div>
      )}
    </div>
  );
}

/** Memoized on the fields that change a rendered row (in-place edits + chip). */
export const ToolCallRow = memo(
  ToolCallRowImpl,
  (a, b) =>
    a.toolCall.id === b.toolCall.id &&
    a.toolCall.status === b.toolCall.status &&
    a.toolCall.updatedAt === b.toolCall.updatedAt &&
    a.toolCall.resultTail === b.toolCall.resultTail &&
    a.toolCall.errorMessage === b.toolCall.errorMessage &&
    a.majoritySessionId === b.majoritySessionId,
);

export interface ToolCallClusterProps {
  tools: ToolCall[];
  majoritySessionId?: string;
}

/** Aggregate tone: any failure dominates, else warning-if-blocked, else success. */
function clusterTone(tools: ToolCall[]): StatusTone {
  if (tools.some((t) => t.status === "error")) return "danger";
  if (tools.some((t) => t.status === "blocked")) return "warning";
  return "success";
}

function ToolCallClusterImpl({ tools, majoritySessionId }: ToolCallClusterProps) {
  const [open, setOpen] = useState(false);
  const tone = clusterTone(tools);
  const failures = tools.filter((t) => t.status === "error" || t.status === "blocked").length;

  return (
    <div data-kind="tool-cluster">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ ...rowStyle, cursor: "pointer" }}
      >
        <span aria-hidden style={{ color: "var(--hc-text-tertiary)", display: "inline-flex" }}>
          <CommandIcon />
        </span>
        <Text size="sm" weight="medium" tone="secondary">
          {tools.length} tool calls
        </Text>
        {failures > 0 && (
          <Badge size="sm" tone={tone} variant="subtle">
            {failures} failed
          </Badge>
        )}
        <span style={{ flex: 1 }} />
        <span aria-hidden style={{ color: "var(--hc-text-tertiary)", fontSize: "var(--hc-font-size-xs)" }}>
          {open ? "▾ hide" : "▸ show"}
        </span>
      </button>
      {open && (
        <div style={{ marginLeft: "var(--hc-space-3)" }}>
          {tools.map((t) => (
            <ToolCallRow key={t.id} toolCall={t} majoritySessionId={majoritySessionId} />
          ))}
        </div>
      )}
    </div>
  );
}

export const ToolCallCluster = memo(ToolCallClusterImpl);
