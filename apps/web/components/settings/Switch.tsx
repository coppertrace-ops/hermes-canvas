"use client";

/**
 * Accessible toggle switch (Settings, Wave 2). A native `<button>` with
 * `role="switch"` + `aria-checked` — so it is keyboard-operable (Space/Enter),
 * focus-visible, and announces its on/off state to assistive tech. Meaning never
 * rides on the track colour alone: the thumb position and `aria-checked` both
 * carry it. Styling lives in `hc-switch*` (components.css); state is driven by
 * `aria-checked` so there is no colour-only branch in the rule.
 */

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name for the control (e.g. the flag's title). */
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled = false, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      aria-busy={disabled || undefined}
      onClick={() => onChange(!checked)}
      className={className ? `hc-switch ${className}` : "hc-switch"}
    >
      <span className="hc-switch__thumb" aria-hidden="true" />
    </button>
  );
}
