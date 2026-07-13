/**
 * Artifact-level diff dispatch (plan §3).
 *
 * Given two versions of an artifact, produce the type-appropriate diff and the
 * header label the timeline shows. The label is derived from the *after*
 * version's server-recorded `resolved_action.op` — NOT re-inferred from the
 * content — so a whole-document rewrite is always labeled `replace_all` and a
 * localized edit is labeled `region`, exactly as the server recorded it (plan
 * §2.2 ground truth; G4 adversarial cases).
 */

import type { ArtifactType, RenderState, ResolvedAction } from "@hermes/contract";
import { diffBoard } from "./board";
import type { BoardDiff } from "./board";
import { diffHtml } from "./html";
import type { HtmlDiff } from "./html";
import { diffMarkdown } from "./markdown";
import type { MarkdownDiff } from "./markdown";
import { diffMermaid } from "./mermaid";
import type { MermaidDiff } from "./mermaid";
import { diffLines } from "./text";
import type { LineDiff } from "./text";

/** One version's inputs to a diff — content plus the fields the header needs. */
export interface DiffVersionInput {
  seq: number;
  content: string;
  renderState?: RenderState;
  resolvedAction?: ResolvedAction;
}

/** The human-facing label for the change, read from `resolved_action.op`. */
export type ChangeScope = "create" | "replace_all" | "region" | "restore" | "archive" | "unknown";

export interface DiffHeader {
  /** How the writer scoped the change, per the server's record (never inferred). */
  scope: ChangeScope;
  /** A short human label, e.g. "Whole-document rewrite" or "Region edit — heading: Auth". */
  label: string;
  /** For region edits, the resolved region description (heading / line range). */
  region?: string;
  /** For restores, the seq whose content was reinstated. */
  restoredFromSeq?: number;
}

export type ArtifactDiffBody =
  | { kind: "markdown"; diff: MarkdownDiff }
  | { kind: "mermaid"; diff: MermaidDiff }
  | { kind: "board"; diff: BoardDiff }
  | { kind: "html-static"; diff: HtmlDiff }
  /** Board content that failed to parse falls back to a source line diff, visibly. */
  | { kind: "board-fallback"; diff: LineDiff; error: string };

export interface ArtifactDiff {
  header: DiffHeader;
  body: ArtifactDiffBody;
  /** Convenience: true when nothing changed between the two versions. */
  identical: boolean;
}

function scopeLabel(scope: ChangeScope, region?: string, restoredFromSeq?: number): string {
  switch (scope) {
    case "create":
      return "Created";
    case "replace_all":
      return "Whole-document rewrite";
    case "region":
      return region ? `Region edit — ${region}` : "Region edit";
    case "restore":
      return restoredFromSeq !== undefined ? `Restored from v${restoredFromSeq}` : "Restored";
    case "archive":
      return "Archived";
    default:
      return "Updated";
  }
}

export function buildHeader(after: DiffVersionInput): DiffHeader {
  const op = after.resolvedAction?.op;
  const scope: ChangeScope =
    op === "create" ||
    op === "replace_all" ||
    op === "region" ||
    op === "restore" ||
    op === "archive"
      ? op
      : "unknown";
  const region = after.resolvedAction?.region;
  const restoredFromSeq = after.resolvedAction?.restored_from_seq;
  return { scope, label: scopeLabel(scope, region, restoredFromSeq), region, restoredFromSeq };
}

/**
 * Diff two versions of an artifact of the given `type`. `before` may be null for
 * the create version (seq 1), in which case everything is an insertion.
 */
export function diffArtifact(
  type: ArtifactType,
  before: DiffVersionInput | null,
  after: DiffVersionInput,
): ArtifactDiff {
  const header = buildHeader(after);
  const beforeContent = before?.content ?? "";
  const beforeErr = before?.renderState === "render_error";
  const afterErr = after.renderState === "render_error";

  let body: ArtifactDiffBody;
  switch (type) {
    case "markdown": {
      body = { kind: "markdown", diff: diffMarkdown(beforeContent, after.content) };
      break;
    }
    case "mermaid": {
      body = {
        kind: "mermaid",
        diff: diffMermaid({
          before: beforeContent,
          after: after.content,
          beforeRenderError: beforeErr,
          afterRenderError: afterErr,
        }),
      };
      break;
    }
    case "html-static": {
      body = {
        kind: "html-static",
        diff: diffHtml({
          before: beforeContent,
          after: after.content,
          beforeRenderError: beforeErr,
          afterRenderError: afterErr,
        }),
      };
      break;
    }
    case "board": {
      try {
        body = {
          kind: "board",
          diff: diffBoard(beforeContent === "" ? '{"columns":[]}' : beforeContent, after.content),
        };
      } catch (e) {
        // Malformed board JSON must fail visibly, not blankly (plan §2.2).
        body = {
          kind: "board-fallback",
          diff: diffLines(beforeContent, after.content),
          error: e instanceof Error ? e.message : "board content is not valid JSON",
        };
      }
      break;
    }
    default: {
      // Exhaustiveness guard; unreachable for the four known types.
      const _never: never = type;
      throw new Error(`unsupported artifact type: ${String(_never)}`);
    }
  }

  return { header, body, identical: isIdentical(body) };
}

function isIdentical(body: ArtifactDiffBody): boolean {
  switch (body.kind) {
    case "markdown":
      return body.diff.identical;
    case "mermaid":
      return body.diff.identical;
    case "html-static":
      return body.diff.identical;
    case "board":
      return body.diff.identical;
    case "board-fallback":
      return body.diff.identical;
  }
}
