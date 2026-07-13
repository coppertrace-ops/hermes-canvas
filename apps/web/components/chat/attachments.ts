/**
 * Attachment client helpers (OWNER: COURIER).
 *
 * Pure, DOM-free functions so they unit-test without a browser: the 10 MB client
 * guard, byte formatting, image sniffing, and status→tone mapping. The size cap
 * is imported from `@hermes/policy` (WARDEN) so the client guard and the server
 * guard in `convex/files.ts` name the exact same limit — no drift, and the client
 * check is a courtesy that fails fast, never the security boundary (the server
 * re-checks every upload).
 */

import { LIMITS } from "@hermes/policy";
import type { StatusTone } from "@hermes/ui";
import type { AttachmentStatus, AttachmentView } from "./types";

/** The authoritative attachment size cap (10 MB), from WARDEN's policy. */
export const MAX_ATTACHMENT_BYTES = LIMITS.maxAttachmentBytes;

/** Minimal shape a pickable file must have — matches the DOM `File` subset used. */
export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export type GuardResult = { ok: true } | { ok: false; code: "oversize" | "empty"; message: string };

/**
 * Enforce the client-side attachment guard BEFORE any bytes leave the browser.
 * Oversize is a visible, named rejection (plan §2.2: "visible rejection with the
 * limit named, never truncation"). Empty files are rejected too — a 0-byte
 * upload is almost always a mistake and produces a useless attachment.
 */
export function guardAttachment(file: FileLike): GuardResult {
  if (file.size <= 0) {
    return { ok: false, code: "empty", message: `“${file.name}” is empty (0 bytes).` };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      code: "oversize",
      message: `“${file.name}” is ${formatBytes(file.size)}, over the ${formatBytes(
        MAX_ATTACHMENT_BYTES,
      )} limit.`,
    };
  }
  return { ok: true };
}

/** Format a byte count as a compact human string (e.g. "1.4 MB", "812 KB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10, none above — keeps the label short and honest.
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** True for MIME types that can be previewed as an inline <img> from local bytes. */
export function isImageMime(mime: string): boolean {
  return /^image\/(png|jpeg|gif|webp|avif|bmp|x-icon)$/i.test(mime);
}

/** Map an attachment lifecycle state to a design-system status tone. */
export function attachmentStatusTone(status: AttachmentStatus): StatusTone {
  switch (status) {
    case "ready":
      return "success";
    case "error":
      return "danger";
    case "uploading":
      return "info";
    case "pending":
    default:
      return "neutral";
  }
}

/** Whether the composer may send: at least text or one ready attachment, none failed/uploading. */
export function canSendDraft(text: string, attachments: AttachmentView[]): boolean {
  const hasContent = text.trim().length > 0 || attachments.some((a) => a.status === "ready");
  const settled = attachments.every((a) => a.status === "ready");
  return hasContent && settled;
}
