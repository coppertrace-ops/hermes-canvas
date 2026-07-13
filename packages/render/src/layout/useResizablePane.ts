import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

/**
 * Resizable-pane state + interaction (PANES; plan §7 "resizable divider,
 * persisted"). Framework-generic and SSR-safe: the primary pane's size is a
 * fraction in `[min, max]`, persisted to `localStorage` under `storageKey` so a
 * layout survives reload. Returns a `separatorProps` bag to spread onto the
 * divider — it is pointer-draggable and keyboard-operable (a `separator` with
 * `aria-valuenow`), so the shell needs no interaction code of its own.
 */
export type PaneOrientation = "horizontal" | "vertical";

export interface UseResizablePaneOptions {
  /** localStorage key for persistence. Omit to keep the size in-memory only. */
  storageKey?: string;
  /** Initial primary-pane fraction (0–1) before any persisted value. */
  defaultFraction?: number;
  /** Clamp bounds for the fraction. */
  min?: number;
  max?: number;
  /** `horizontal` = side-by-side (width); `vertical` = stacked (height). */
  orientation?: PaneOrientation;
  /** Keyboard step per arrow press. */
  step?: number;
}

export interface SeparatorProps {
  role: "separator";
  tabIndex: 0;
  "aria-orientation": PaneOrientation;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  onPointerDown(e: PointerEvent): void;
  onKeyDown(e: KeyboardEvent): void;
}

export interface ResizablePane {
  /** Current primary-pane fraction (0–1). */
  fraction: number;
  setFraction(next: number): void;
  containerRef: RefObject<HTMLDivElement | null>;
  separatorProps: SeparatorProps;
  isDragging: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function readPersisted(key: string | undefined, fallback: number): number {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function useResizablePane(options: UseResizablePaneOptions = {}): ResizablePane {
  const {
    storageKey,
    defaultFraction = 0.5,
    min = 0.15,
    max = 0.85,
    orientation = "horizontal",
    step = 0.02,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fraction, setFractionState] = useState<number>(() =>
    clamp(readPersisted(storageKey, defaultFraction), min, max),
  );
  const [isDragging, setIsDragging] = useState(false);

  const setFraction = useCallback(
    (next: number) => setFractionState(clamp(next, min, max)),
    [min, max],
  );

  // Persist on change.
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, String(fraction));
    } catch {
      /* storage disabled — persistence is best-effort, layout still works */
    }
  }, [storageKey, fraction]);

  const fractionFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (orientation === "horizontal") {
        if (rect.width === 0) return null;
        return (clientX - rect.left) / rect.width;
      }
      if (rect.height === 0) return null;
      return (clientY - rect.top) / rect.height;
    },
    [orientation],
  );

  // Global drag listeners while dragging.
  useEffect(() => {
    if (!isDragging || typeof window === "undefined") return;
    const onMove = (e: globalThis.PointerEvent) => {
      const f = fractionFromPoint(e.clientX, e.clientY);
      if (f !== null) setFraction(f);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, fractionFromPoint, setFraction]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const dec = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const inc = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      if (e.key === dec) {
        e.preventDefault();
        setFraction(fraction - step);
      } else if (e.key === inc) {
        e.preventDefault();
        setFraction(fraction + step);
      } else if (e.key === "Home") {
        e.preventDefault();
        setFraction(min);
      } else if (e.key === "End") {
        e.preventDefault();
        setFraction(max);
      }
    },
    [orientation, fraction, step, setFraction, min, max],
  );

  return {
    fraction,
    setFraction,
    containerRef,
    isDragging,
    separatorProps: {
      role: "separator",
      tabIndex: 0,
      "aria-orientation": orientation,
      "aria-valuemin": Math.round(min * 100),
      "aria-valuemax": Math.round(max * 100),
      "aria-valuenow": Math.round(fraction * 100),
      onPointerDown,
      onKeyDown,
    },
  };
}
