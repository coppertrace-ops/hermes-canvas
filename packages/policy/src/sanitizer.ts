/**
 * Content sanitizer policy (OWNER: WARDEN, spec §2.3).
 *
 * The authoritative strict posture for agent-authored content rendered on the
 * APP origin. `@hermes/render`'s Markdown/Mermaid renderers consume these as the
 * single source (the render package's local default mirrors this shape and is
 * wired to import from here) so the sanitizer config can't drift from the policy
 * the threat model documents.
 *
 * Posture (plan §4):
 *   - No raw HTML passthrough — Markdown is parsed to a safe AST, never injected
 *     as HTML; there is no `dangerouslySetInnerHTML` path.
 *   - Links limited to `http/https/mailto`; `javascript:` and every other scheme
 *     render as inert plain text.
 *   - External images are BLOCKED and shown as a visible placeholder with the
 *     target URL (exfil attempt → audit evidence); no `<img>` that would fetch is
 *     emitted. `imageSchemes` is empty: only same-document/data handling, no
 *     remote fetch.
 *   - Mermaid runs at `securityLevel: 'strict'`.
 */

export interface MarkdownSanitizerPolicy {
  /** URL schemes permitted for links. Everything else renders as plain text. */
  linkSchemes: readonly string[];
  /** Block http/https/protocol-relative images, showing the URL as evidence. */
  blockExternalImages: boolean;
  /** Non-remote image schemes allowed to load (empty = no remote fetch at all). */
  imageSchemes: readonly string[];
}

export const MARKDOWN_SANITIZER_POLICY: MarkdownSanitizerPolicy = {
  linkSchemes: ["http", "https", "mailto"],
  blockExternalImages: true,
  imageSchemes: [],
};

/** Mermaid runs strict — no click bindings, no arbitrary HTML labels. */
export const MERMAID_SECURITY_LEVEL = "strict" as const;
