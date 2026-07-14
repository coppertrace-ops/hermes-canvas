"use client";

/**
 * CopyButton (OWNER: COURIER) — a quiet hover affordance for copying text.
 *
 * Used on agent message bubbles and on code blocks. It stays out of the way
 * (revealed on hover of its container, via the `visible` prop) but is always in the
 * DOM and keyboard-reachable — focusing it reveals it regardless of hover, so the
 * copy action is not mouse-only. On success it flips to a transient "Copied" state.
 *
 * Clipboard access is browser-only; the click handler no-ops gracefully where the
 * async Clipboard API is unavailable.
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";

export interface CopyButtonProps {
  /** The text to place on the clipboard, or a getter resolved at click time. */
  text: string | (() => string);
  /** Whether the container currently wants the button shown (hover). */
  visible?: boolean;
  /** Accessible label; defaults to "Copy". */
  label?: string;
  /** Extra positioning styles merged onto the button. */
  style?: CSSProperties;
}

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--hc-space-1)",
  padding: "2px var(--hc-space-1)",
  fontSize: "var(--hc-font-size-xs)",
  lineHeight: 1.4,
  color: "var(--hc-text-secondary)",
  background: "var(--hc-surface)",
  border: "var(--hc-border-width) solid var(--hc-border)",
  borderRadius: "var(--hc-radius-sm)",
  cursor: "pointer",
  transition: "opacity var(--hc-duration-1, 120ms) var(--hc-ease-out, ease)",
};

export function CopyButton({ text, visible = false, label = "Copy", style }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(async () => {
    try {
      const value = typeof text === "function" ? text() : text;
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard denied/unavailable — leave the label unchanged rather than lie.
    }
  }, [text]);

  const shown = visible || focused || copied;

  return (
    <button
      type="button"
      onClick={onCopy}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={copied ? "Copied" : label}
      style={{
        ...base,
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        ...style,
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
