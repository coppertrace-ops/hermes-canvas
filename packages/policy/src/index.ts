/**
 * @hermes/policy — security policy constants and helpers (OWNER: WARDEN).
 *
 * The single source of truth for the Wave 2 security posture: the two CSP strings
 * (content-origin egress kill + app-origin hardening), the iframe sandbox
 * attribute, the sandbox frame postMessage protocol (schemas + both-ends identity
 * verifiers), the attachment header policy, the Markdown/Mermaid sanitizer config,
 * and the size/rate/grace limits. Consumers (`apps/content` shell, PANES host tile,
 * ATLAS `next.config.mjs`, COURIER `files.ts`, PANES `@hermes/render`) import from
 * here verbatim — one source, no drift, so the header/verifier a test asserts is
 * byte-identical to the one shipped.
 */

/**
 * Bumped from the pre-G2 stub to the real WARDEN implementation. G5 signs off the
 * security suite against this version.
 */
export const POLICY_VERSION = "1.0.0-g5" as const;

export * from "./limits";
export * from "./csp";
export * from "./sandbox";
export * from "./frameProtocol";
export * from "./attachments";
export * from "./sanitizer";
