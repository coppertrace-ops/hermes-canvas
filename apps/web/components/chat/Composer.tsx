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

/** sessionStorage key for the unsent draft, restored across reloads within a tab. */
const DRAFT_KEY = "hermes.chat.draft";
/** Max auto-grow height (~8 lines) before the textarea scrolls internally. */
const MAX_TEXTAREA_PX = 192;

function readDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(DRAFT_KEY, value);
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private-mode / quota — a lost draft is acceptable; never throw on keystroke.
  }
}

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Side-channel maps that must not trigger re-renders.
  const handles = useRef(new Map<string, UploadHandle>());
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Map<string, string>());
  /**
   * Local attachment id → the server attachment id the backend returns once the
   * upload binds. The chip keeps its stable local id (so its preview URL, retry,
   * and removal all keep working); the SEND must reference the server id, which is
   * what `human.sendMessage` validates against the attachments table.
   */
  const readyServerIds = useRef(new Map<string, string>());

  /** Reset then grow the textarea to fit its content, clamped to the max height. */
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_PX ? "auto" : "hidden";
  }, []);

  const updateText = useCallback(
    (value: string) => {
      setText(value);
      writeDraft(value);
    },
    [],
  );

  // Restore any persisted draft, size the box to it, and focus on mount.
  useEffect(() => {
    const saved = readDraft();
    if (saved) setText(saved);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      // Grow to the restored content after the value has painted.
      requestAnimationFrame(autoGrow);
    }
  }, []);

  // Keep the box sized to the current text (covers programmatic setText too).
  useEffect(() => {
    autoGrow();
  }, [text, autoGrow]);

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
        .then((ready) => {
          readyServerIds.current.set(id, ready.id);
          patch(id, { status: "ready", progress: 1 });
        })
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
      readyServerIds.current.delete(id);
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
    readyServerIds.current.clear();
    setText("");
    writeDraft("");
    setAttachments([]);
  }, [revokePreview]);

  const canSend = !disabled && canSendDraft(text, attachments);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    // Send the SERVER attachment ids (what the backend bound), falling back to the
    // local id only for backends that treat them as one and the same (the mock).
    const attachmentIds = attachments
      .filter((a) => a.status === "ready")
      .map((a) => readyServerIds.current.get(a.id) ?? a.id);
    void backend.send({ text: text.trim(), attachmentIds });
    reset();
    // Return focus so a rapid back-and-forth never requires reaching for the mouse.
    textareaRef.current?.focus();
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
          ref={textareaRef}
          value={text}
          onChange={(e) => updateText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Message"
          style={{
            flex: 1,
            resize: "none",
            minHeight: "2.5rem",
            maxHeight: `${MAX_TEXTAREA_PX}px`,
            overflowY: "hidden",
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
