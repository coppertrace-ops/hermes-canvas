"use client";

/**
 * StreamingDots (OWNER: COURIER) — the "Hermes is typing / streaming" indicator.
 *
 * Three dots with a staggered pulse. Honest: it only ever shows while a message is
 * actually `streaming`; it is not a decorative loader. Respects reduced-motion via
 * the design system's motion tokens (the animation is defined inline but eased with
 * the house easing var, and collapses to a static row if animations are disabled).
 */

import type { CSSProperties } from "react";

const row: CSSProperties = {
  display: "inline-flex",
  gap: "3px",
  alignItems: "center",
  height: "1em",
};

const dot: CSSProperties = {
  width: "5px",
  height: "5px",
  borderRadius: "var(--hc-radius-full)",
  background: "var(--hc-text-tertiary)",
  animation: "hc-chat-blink 1.2s var(--hc-ease-in-out) infinite",
};

export function StreamingDots({ label = "Hermes is responding" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} style={row}>
      <style>{keyframes}</style>
      <span style={{ ...dot, animationDelay: "0ms" }} />
      <span style={{ ...dot, animationDelay: "160ms" }} />
      <span style={{ ...dot, animationDelay: "320ms" }} />
    </span>
  );
}

const keyframes = `
@keyframes hc-chat-blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  span[style*="hc-chat-blink"] { animation: none !important; opacity: 0.6 !important; }
}
`;
