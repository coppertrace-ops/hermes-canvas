"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import type { IconButtonSize, IconButtonVariant } from "./IconButton";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";
import {
  applyTheme,
  getStoredPreference,
  nextPreference,
  storePreference,
  type ThemePreference,
} from "../theme";

const ICON: Record<ThemePreference, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
};

const LABEL: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export interface ThemeToggleProps {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  className?: string;
}

/**
 * Cycles the persisted theme preference: system → light → dark → system. The
 * no-flash init script (apps/web layout) sets the initial paint; this control
 * only needs to hydrate to the stored value and mutate it on click. Rendering a
 * stable default first avoids a hydration mismatch, then `useEffect` reconciles.
 */
export function ThemeToggle({ size = "md", variant = "ghost", className }: ThemeToggleProps) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreference(getStoredPreference());
    setMounted(true);
  }, []);

  function handleClick() {
    const next = nextPreference(preference);
    applyTheme(next);
    storePreference(next);
    setPreference(next);
  }

  // Before hydration completes, show a neutral system glyph so SSR and the first
  // client render agree.
  const shown = mounted ? preference : "system";

  return (
    <IconButton
      label={`Theme: ${LABEL[shown]}. Switch to ${LABEL[nextPreference(shown)]}.`}
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
      data-theme-preference={shown}
    >
      {ICON[shown]}
    </IconButton>
  );
}
