import { z } from "zod";

/**
 * Artifact type + status vocabulary (plan §3).
 *
 * Stable identity rule (binding): an update never mints a new artifact id; only
 * `head_seq` moves. Removal is soft-archive only — there is no delete path.
 */

export const artifactTypeSchema = z.enum(["markdown", "mermaid", "html-static", "board"]);
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

export const artifactStatusSchema = z.enum(["active", "archived"]);
export type ArtifactStatus = z.infer<typeof artifactStatusSchema>;

export const authorSchema = z.enum(["human", "agent"]);
export type Author = z.infer<typeof authorSchema>;

/** Render-state flag stored on a version (plan §2.2 — mermaid parse failures). */
export const renderStateSchema = z.enum(["ok", "render_error"]);
export type RenderState = z.infer<typeof renderStateSchema>;
