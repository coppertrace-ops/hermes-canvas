"use client";

/**
 * AttachmentPicker (OWNER: COURIER) — the "attach a file" affordance.
 *
 * A hidden `<input type=file>` fronted by an icon button. Every picked file is
 * run through the 10 MB client guard (`guardAttachment`) BEFORE it is handed up:
 * accepted files go to `onPick`, rejected ones to `onReject` with a named,
 * visible reason. The guard here is a fast courtesy — the server re-checks — but
 * it means an oversize file never starts an upload at all.
 */

import { IconButton } from "@hermes/ui";
import { useRef } from "react";
import { guardAttachment } from "./attachments";
import type { FileLike } from "./attachments";

export interface AttachmentPickerProps {
  onPick: (files: File[]) => void;
  /** Called once per rejected file with the named reason. */
  onReject?: (file: FileLike, message: string) => void;
  disabled?: boolean;
  /** Restrict the native picker; does not replace the guard. */
  accept?: string;
  multiple?: boolean;
}

export function AttachmentPicker({
  onPick,
  onReject,
  disabled,
  accept,
  multiple = true,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const accepted: File[] = [];
    for (const file of picked) {
      const result = guardAttachment(file);
      if (result.ok) accepted.push(file);
      else onReject?.(file, result.message);
    }
    if (accepted.length) onPick(accepted);
    // Reset so re-picking the same file fires `change` again.
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: "none" }}
        tabIndex={-1}
        aria-hidden
      />
      <IconButton
        label="Attach a file"
        variant="ghost"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipGlyph />
      </IconButton>
    </>
  );
}

function PaperclipGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
    </svg>
  );
}
