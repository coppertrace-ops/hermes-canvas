/**
 * Shared test fixtures (also usable by the history components' stories/mocks).
 *
 * `scriptedSession` builds the G4 "scripted 20-write agent session" as a real
 * append-only version chain: creates, region edits, whole-doc rewrites, a
 * contended stale-parent write, and a restore. The timeline/diff tests assert the
 * whole session is reconstructable from these records alone.
 */

import type { ArtifactVersion, ResolvedAction } from "@hermes/contract";

export interface BuildVersion {
  seq: number;
  parent_seq: number | null;
  content: string;
  author?: ArtifactVersion["author"];
  why?: string;
  contended?: boolean;
  renderState?: ArtifactVersion["render_state"];
  resolved: ResolvedAction;
  at?: number;
}

export function version(v: BuildVersion, artifactId = "art_1"): ArtifactVersion {
  return {
    artifact_id: artifactId,
    seq: v.seq,
    parent_seq: v.parent_seq,
    content: v.content,
    content_size: v.content.length,
    author: v.author ?? "agent",
    why: v.why,
    contended: v.contended ?? false,
    render_state: v.renderState ?? "ok",
    resolved_action: v.resolved,
    created_at: v.at ?? 1_000 + v.seq,
  };
}

/**
 * A 20-version markdown-artifact session. Each write has a distinct `why` and a
 * server-recorded `resolved_action`, so every "what / why / when" is present.
 * Includes: create (v1), region edits, a whole-doc rewrite (v6), a contended
 * stale-parent write (v13 forked off v11), and a restore (v20 ← v5).
 */
export function scriptedSession(): { versions: ArtifactVersion[]; headSeq: number } {
  const base = [
    "# Design notes",
    "",
    "## Overview",
    "",
    "This document describes the Hermes canvas system.",
    "",
    "## Auth",
    "",
    "Auth uses sessions and a shared secret.",
    "",
    "## Storage",
    "",
    "All state lives in Convex.",
  ].join("\n");

  const withAuth = (text: string) => base.replace("Auth uses sessions and a shared secret.", text);
  const versions: ArtifactVersion[] = [];

  versions.push(
    version({
      seq: 1,
      parent_seq: null,
      content: base,
      why: "seed the design doc",
      resolved: { op: "create", target: "art_1" },
    }),
  );

  // v2..v5 region edits to the Auth section.
  const authEdits = [
    "Auth uses JWT sessions.",
    "Auth uses JWT sessions and a rotated service token.",
    "Auth uses JWT sessions, a rotated service token, and constant-time compare.",
    "Auth uses JWT sessions, a rotated service token, constant-time compare, and no signup path.",
  ];
  authEdits.forEach((edit, i) => {
    const seq = i + 2;
    versions.push(
      version({
        seq,
        parent_seq: seq - 1,
        content: withAuth(edit),
        why: `tighten the auth section (${i + 1})`,
        resolved: { op: "region", target: "art_1", region: 'heading:"Auth"' },
      }),
    );
  });

  // v6 whole-document rewrite.
  const rewrite = [
    "# Design notes (v2)",
    "",
    "## Goals",
    "",
    "Legible history, safe restore, honest change surfacing.",
    "",
    "## Auth",
    "",
    "Auth uses JWT sessions, a rotated service token, constant-time compare, and no signup path.",
    "",
    "## Storage",
    "",
    "All state lives in Convex; versions and events are append-only.",
  ].join("\n");
  versions.push(
    version({
      seq: 6,
      parent_seq: 5,
      content: rewrite,
      why: "restructure around the three goals",
      resolved: { op: "replace_all", target: "art_1" },
    }),
  );

  // v7..v12 more region edits (storage + goals).
  let content = rewrite;
  for (let i = 0; i < 6; i++) {
    const seq = i + 7;
    content = content.replace(/append-only\.?$/m, `append-only (rev ${i + 1}).`);
    versions.push(
      version({
        seq,
        parent_seq: seq - 1,
        content,
        why: `clarify storage guarantees (${i + 1})`,
        resolved: { op: "region", target: "art_1", region: 'heading:"Storage"' },
      }),
    );
  }

  // v13 CONTENDED: written against stale parent v11 while head was v12.
  const contendedContent = content.replace("## Goals", "## Objectives");
  versions.push(
    version({
      seq: 13,
      parent_seq: 11,
      content: contendedContent,
      why: "rename Goals to Objectives",
      contended: true,
      resolved: { op: "region", target: "art_1", region: 'heading:"Goals"' },
    }),
  );

  // v14..v19 continue.
  content = contendedContent;
  for (let i = 0; i < 6; i++) {
    const seq = i + 14;
    content = content + `\n\n<!-- note ${i + 1} -->`;
    versions.push(
      version({
        seq,
        parent_seq: seq - 1,
        content,
        why: `append working note ${i + 1}`,
        resolved: { op: "region", target: "art_1", region: "end-of-document" },
      }),
    );
  }

  // v20 RESTORE of v5's content (append-only).
  const v5 = versions.find((v) => v.seq === 5)!;
  versions.push(
    version({
      seq: 20,
      parent_seq: 19,
      content: v5.content,
      author: "human",
      why: "roll back to the pre-rewrite auth wording",
      resolved: { op: "restore", target: "art_1", restored_from_seq: 5 },
    }),
  );

  return { versions, headSeq: 20 };
}
