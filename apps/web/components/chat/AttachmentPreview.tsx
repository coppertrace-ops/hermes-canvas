"use client";

/**
 * AttachmentPreview (OWNER: COURIER) — one attachment chip/tile.
 *
 * Renders a picked or uploaded attachment: an inline image thumbnail when the
 * file is an image and a LOCAL object-url preview exists, otherwise a file glyph
 * with name + size. Shows an upload progress bar while `uploading` and an honest
 * error+retry state on failure.
 *
 * Security note: the only image source ever used here is `previewUrl`, a local
 * `blob:`/object URL of the human's own picked bytes. Attachments are NEVER
 * rendered from the serving origin — that path is download-only with `nosniff`
 * (plan §4, enforced in `convex/files.ts`). This preview is the user's own file,
 * pre-upload, and never a served response.
 */

import { Badge, IconButton, Text } from "@hermes/ui";
import type { CSSProperties } from "react";
import { attachmentStatusTone, formatBytes, isImageMime } from "./attachments";
import type { AttachmentView } from "./types";

export interface AttachmentPreviewProps {
  attachment: AttachmentView;
  /** Remove from the draft (pre-send) or dismiss a failed upload. */
  onRemove?: (id: string) => void;
  /** Retry a failed upload. */
  onRetry?: (id: string) => void;
  /** Compact variant for rendering inside a sent bubble (no controls). */
  readOnly?: boolean;
}

const wrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--hc-space-2)",
  padding: "var(--hc-space-2)",
  borderRadius: "var(--hc-radius-md)",
  border: "var(--hc-border-width) solid var(--hc-border)",
  background: "var(--hc-surface)",
  maxWidth: "16rem",
};

const thumb: CSSProperties = {
  width: "2rem",
  height: "2rem",
  borderRadius: "var(--hc-radius-sm)",
  objectFit: "cover",
  flexShrink: 0,
  background: "var(--hc-surface-sunken)",
};

const glyph: CSSProperties = {
  ...thumb,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--hc-text-tertiary)",
};

export function AttachmentPreview({
  attachment,
  onRemove,
  onRetry,
  readOnly = false,
}: AttachmentPreviewProps) {
  const { id, name, mime, size, status, progress, error, previewUrl } = attachment;
  const showImage = previewUrl && isImageMime(mime);

  return (
    <div style={wrap} data-status={status} aria-label={`Attachment ${name}, ${status}`}>
      {showImage ? (
        // A local object-url preview of the user's OWN picked bytes — never a
        // served asset, so a plain <img> is correct here (no next/image origin).
        <img src={previewUrl} alt="" style={thumb} />
      ) : (
        <span style={glyph} aria-hidden>
          <FileGlyph />
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" weight="medium" truncate title={name}>
          {name}
        </Text>
        {status === "uploading" ? (
          <ProgressBar fraction={progress ?? 0} />
        ) : status === "error" ? (
          <Text size="xs" tone="danger" truncate title={error}>
            {error ?? "Upload failed"}
          </Text>
        ) : (
          <Text size="xs" tone="tertiary">
            {size > 0 ? formatBytes(size) : mime || "file"}
          </Text>
        )}
      </div>

      {status !== "uploading" && (
        <Badge tone={attachmentStatusTone(status)} size="sm" variant="subtle">
          {status}
        </Badge>
      )}

      {!readOnly && status === "error" && onRetry && (
        <IconButton label={`Retry upload of ${name}`} size="sm" onClick={() => onRetry(id)}>
          <RetryGlyph />
        </IconButton>
      )}
      {!readOnly && onRemove && status !== "uploading" && (
        <IconButton label={`Remove ${name}`} size="sm" onClick={() => onRemove(id)}>
          <CloseGlyph />
        </IconButton>
      )}
    </div>
  );
}

/** A slim determinate progress bar for an in-flight upload. */
export function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height: "4px",
        borderRadius: "var(--hc-radius-full)",
        background: "var(--hc-surface-sunken)",
        overflow: "hidden",
        marginTop: "var(--hc-space-1)",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "var(--hc-accent)",
          transition: "width var(--hc-duration-1) var(--hc-ease-out)",
        }}
      />
    </div>
  );
}

function FileGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function CloseGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function RetryGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
