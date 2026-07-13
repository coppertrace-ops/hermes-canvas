/**
 * @hermes/ui — theme model (GLASS, plan §7).
 *
 * Dark & light are first-class. The owner's *preference* is one of three values
 * and is persisted; the *resolved* theme is what actually paints. "system" means
 * "follow the OS", so a live OS change is honored without a reload (we clear the
 * attribute and let the `prefers-color-scheme` media query drive the tokens).
 *
 * These helpers are framework-agnostic and SSR-safe (every DOM touch is guarded).
 * The same logic is inlined as a blocking `<script>` in apps/web/app/layout.tsx
 * to prevent a flash of the wrong theme before hydration — keep the two in sync.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** localStorage key holding the persisted {@link ThemePreference}. */
export const THEME_STORAGE_KEY = "hc-theme";

const PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Does the OS currently ask for dark? False in non-browser environments. */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Collapse a preference into the theme that will actually paint. */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean = systemPrefersDark(),
): ResolvedTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/** Read the persisted preference, defaulting to "system". */
export function getStoredPreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/** Persist the preference. Silently no-ops where storage is unavailable. */
export function storePreference(preference: ThemePreference): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* storage disabled — the in-memory choice still applies for this session */
  }
}

/**
 * Apply a preference to <html>: pin `data-theme` for explicit choices, or clear
 * it for "system" so the media query governs. Also sets `color-scheme` so native
 * form controls / scrollbars match. Returns the resolved theme.
 */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (preference === "system") {
      delete root.dataset.theme;
      root.style.colorScheme = "light dark";
    } else {
      root.dataset.theme = preference;
      root.style.colorScheme = preference;
    }
  }
  return resolved;
}

/** The next preference in the system → light → dark → system cycle. */
export function nextPreference(current: ThemePreference): ThemePreference {
  const index = PREFERENCES.indexOf(current);
  return PREFERENCES[(index + 1) % PREFERENCES.length] ?? "system";
}

/**
 * Blocking init script (as a string) for the document <head>. Resolves and
 * applies the persisted theme before first paint so there is no flash. Mirrors
 * {@link applyTheme}; kept as a self-contained IIFE with no external references.
 */
export function createThemeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var p=localStorage.getItem(k);var d=document.documentElement;if(p==='light'||p==='dark'){d.dataset.theme=p;d.style.colorScheme=p;}else{d.style.colorScheme='light dark';}}catch(e){}})();`;
}
