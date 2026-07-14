/**
 * Iframe sandbox policy (OWNER: WARDEN, spec §2.3).
 *
 * The ONLY sandbox token granted is `allow-scripts` — the artifact may compute.
 * Deliberately absent, each a distinct escape/exfil vector:
 *   - `allow-same-origin` — with `allow-scripts` present, a frame granted this
 *     could reach through and strip its own sandbox. NEVER add it. A CI grep-guard
 *     (`scripts/check-sandbox-grep.mjs`, G5) asserts the literal string appears
 *     nowhere in `apps/` or `packages/` source.
 *   - `allow-popups`, `allow-top-navigation`, `allow-forms`, `allow-downloads`,
 *     `allow-modals`, `allow-pointer-lock`, `allow-presentation` — all withheld.
 *
 * With no `allow` attribute either, powerful features (camera/mic/geolocation…)
 * default-deny. The frame runs at an opaque origin regardless of its host.
 */
export const FRAME_SANDBOX_ATTR = "allow-scripts" as const;

/**
 * Sandbox tokens that must NEVER appear in the frame sandbox attribute. Exported
 * so a test (and the grep-guard's intent) can assert none of them leaked in.
 */
export const FORBIDDEN_SANDBOX_TOKENS = [
  "allow-same-origin",
  "allow-popups",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-forms",
  "allow-downloads",
  "allow-modals",
  "allow-pointer-lock",
  "allow-presentation",
  "allow-popups-to-escape-sandbox",
] as const;
