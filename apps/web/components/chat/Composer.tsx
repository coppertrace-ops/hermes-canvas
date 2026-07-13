"use client";

/**
 * Composer (OWNER: COURIER) — the message input with attachments.
 *
 * Owns the outgoing draft: text plus a list of attachment views. File selection is
 * delegated to `AttachmentPicker`, which runs the 10 MB client guard
 * (`guardAttachment`) BEFORE any bytes leave the browser — an oversize or empty
 * file becomes a visible, named error chip (`onReject`), never a silent drop and
 * never an upload. Accepted files upload through the backend seam with live
 * progress. Send is blocked until the draft has content and every attachment has
 * settled to `ready` (`canSendDraft`).
 *
 * The client guard is a courtesy that fails fast; it is NOT the security boundary —
 * `convex/files.ts` re-checks size and sets download-only headers server-side.
 */

import { Button } from "@hermes/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { AttachmentPicker } from "./AttachmentPicker";
import { AttachmentPreview } from "./AttachmentPreview";
import { canSendDraft, isImageMime } from "./attachments";
import type { FileLike } from "./attachments";
import type { UploadHandle } from "./backend";
import { useChatBackend } from "./ChatProvider";
import type { AttachmentView } from "./types";

let localCounter = 0;
const localId = () => `local_${(localCounter += 1)}`;

const bar: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--hc-space-2)",
  padding: "var(--hc-space-3)",
  borderTop: "var(--hc-border-width) solid var(--hc-border)",
  background: "var(--hc-surface)",
};

export interface ComposerProps {
  /** Placeholder for the empty input. */
  placeholder?: string;
  disabled?: boolean;
}

export function Composer({ placeholder = "Message Hermes…", disabled = false }: ComposerProps) {
  const backend = useChatBackend();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);

  // Side-channel maps that must not trigger re-renders.
  const handles = useRef(new Map<string, UploadHandle>());
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Map<string, string>());

  const patch = useCallback((id: string, next: Partial<AttachmentView>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...next } : a)));
  }, []);

  const revokePreview = useCallback((id: string) => {
    const url = previews.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      previews.current.delete(id);
    }
  }, []);

  const startUpload = useCallback(
    (id: string, file: File) => {
      files.current.set(id, file);
      const handle = backend.upload(file, {
        onProgress: (fraction) => patch(id, { status: "uploading", progress: fraction }),
      });
      handles.current.set(id, handle);
      handle.done
        .then(() => patch(id, { status: "ready", progress: 1 }))
        .catch((err: unknown) => {
          if (err instanceof Error && err.message === "cancelled") return;
          patch(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
        })
        .finally(() => handles.current.delete(id));
    },
    [backend, patch],
  );

  /** Accepted files (already past the picker's 10 MB guard) → start uploads. */
  const handlePicked = useCallback(
    (picked: File[]) => {
      const next: AttachmentView[] = [];
      for (const file of picked) {
        const id = localId();
        let previewUrl: string | undefined;
        if (isImageMime(file.type)) {
          previewUrl = URL.createObjectURL(file);
          previews.current.set(id, previewUrl);
        }
        next.push({
          id,
          name: file.name,
          mime: file.type,
          size: file.size,
          status: "uploading",
          progress: 0,
          previewUrl,
        });
        startUpload(id, file);
      }
      if (next.length) setAttachments((prev) => [...prev, ...next]);
    },
    [startUpload],
  );

  /** Guard-rejected files render as a visible, named error chip — no upload. */
  const handleRejected = useCallback((file: FileLike, message: string) => {
    setAttachments((prev) => [
      ...prev,
      {
        id: localId(),
        name: file.name,
        mime: file.type,
        size: file.size,
        status: "error",
        error: message,
      },
    ]);
  }, []);

  const removeAttachment = useCallback(
    (id: string) => {
      handles.current.get(id)?.cancel();
      handles.current.delete(id);
      files.current.delete(id);
      revokePreview(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    },
    [revokePreview],
  );

  const retryAttachment = useCallback(
    (id: string) => {
      const file = files.current.get(id);
      if (!file) return;
      patch(id, { status: "uploading", progress: 0, error: undefined });
      startUpload(id, file);
    },
    [patch, startUpload],
  );

  const reset = useCallback(() => {
    for (const id of previews.current.keys()) revokePreview(id);
    handles.current.clear();
    files.current.clear();
    setText("");
    setAttachments([]);
  }, [revokePreview]);

  const canSend = !disabled && canSendDraft(text, attachments);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const attachmentIds = attachments.filter((a) => a.status === "ready").map((a) => a.id);
    void backend.send({ text: text.trim(), attachmentIds });
    reset();
  }, [attachments, backend, canSend, reset, text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  return (
    <div style={bar}>
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--hc-space-2)" }}>
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
              onRetry={retryAttachment}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--hc-space-2)" }}>
        <AttachmentPicker onPick={handlePicked} onReject={handleRejected} disabled={disabled} />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Message"
          style={{
            flex: 1,
            resize: "none",
            minHeight: "2.5rem",
            maxHeight: "12rem",
            padding: "var(--hc-space-2) var(--hc-space-3)",
            borderRadius: "var(--hc-radius-md)",
            border: "var(--hc-border-width) solid var(--hc-border)",
            background: "var(--hc-bg)",
            color: "var(--hc-text)",
            font: "inherit",
            fontSize: "var(--hc-font-size-base)",
            lineHeight: "var(--hc-line-normal)",
          }}
        />

        <Button variant="primary" size="md" disabled={!canSend} onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  );
}
