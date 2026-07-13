/**
 * Mermaid engine adapter (PANES, plan §4 / §2.2).
 *
 * The renderer talks to Mermaid only through this narrow, injectable interface so
 * that (a) tests can supply a deterministic fake and (b) the real engine is lazy
 * loaded in the browser (Mermaid touches the DOM and is heavy). The default engine
 * initialises Mermaid at `securityLevel: 'strict'` — the plan §4 requirement — and
 * never renders Mermaid's own error DOM (`suppressErrorRendering`); parse/render
 * failures are surfaced by the React component as an inline error + raw source,
 * never a blank pane.
 */

/** Strict Mermaid configuration (plan §4). Exported for inspection + tests. */
export const STRICT_MERMAID_CONFIG = {
  startOnLoad: false,
  /** No inline SVG/HTML injection from diagram text — the egress/XSS kill. */
  securityLevel: "strict" as const,
  theme: "neutral" as const,
  /** Text-only labels; no `foreignObject`/HTML label pass-through. */
  flowchart: { htmlLabels: false },
  /** We render the error state ourselves; Mermaid must not inject its own. */
  suppressErrorRendering: true,
};

export interface MermaidRenderSuccess {
  ok: true;
  /** Mermaid-produced SVG markup (sanitized by strict security level). */
  svg: string;
}

export interface MermaidRenderFailure {
  ok: false;
  /** Human-readable parse/render error, shown inline above the raw source. */
  error: string;
}

export type MermaidRenderOutcome = MermaidRenderSuccess | MermaidRenderFailure;

export interface MermaidEngine {
  /** Render `source` to SVG, or return a structured failure. Never throws. */
  render(id: string, source: string): Promise<MermaidRenderOutcome>;
}

/** Minimal surface of the `mermaid` module we depend on — version-tolerant. */
interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  parse(text: string): Promise<unknown>;
  render(id: string, text: string): Promise<{ svg: string }>;
}

let enginePromise: Promise<MermaidEngine> | null = null;

/**
 * Lazily load + strictly initialise the real Mermaid engine (browser only).
 * Memoised so Mermaid initialises once per session.
 */
export function loadStrictMermaidEngine(): Promise<MermaidEngine> {
  enginePromise ??= createStrictEngine();
  return enginePromise;
}

async function createStrictEngine(): Promise<MermaidEngine> {
  const mod = (await import("mermaid")) as unknown as { default: MermaidApi };
  const mermaid = mod.default;
  mermaid.initialize(STRICT_MERMAID_CONFIG);
  return {
    async render(id, source) {
      try {
        // Parse first for a clean gate; render also validates but this keeps the
        // failure path explicit even if a future Mermaid softens render throwing.
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        return { ok: true, svg };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
