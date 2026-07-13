/**
 * @hermes/policy — security policy constants and helpers.
 *
 * OWNERSHIP: WARDEN (plan §4, §7). ATLAS created this boundary only. WARDEN owns
 * the real CSP strings, the Markdown sanitizer config, the attachment header policy
 * (Content-Disposition: attachment + nosniff), and the size/rate limits. Consumers
 * (COURIER files serving, PANES renderers, ATLAS app CSP) import from here verbatim
 * rather than re-deriving policy — one source, no drift.
 */

export const POLICY_VERSION = "0.0.0-pre-g2" as const;

/**
 * Size/rate limit targets from the plan §2.2. Placeholder values pending WARDEN's
 * authoritative definitions; do not treat as final until WARDEN signs off (G2).
 */
export const LIMITS = {
  maxVersionBytes: 256 * 1024,
  maxAttachmentBytes: 10 * 1024 * 1024,
  maxMessageBytes: 32 * 1024,
} as const;
