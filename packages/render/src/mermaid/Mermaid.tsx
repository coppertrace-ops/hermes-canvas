import { useEffect, useId, useState } from "react";
import type { MermaidEngine, MermaidRenderOutcome } from "./engine";
import { loadStrictMermaidEngine } from "./engine";

/**
 * Strict Mermaid renderer (PANES, plan §4 / §2.2).
 *
 * Renders a diagram via the injected (or default strict) {@link MermaidEngine}.
 * A parse/render failure is shown as an inline error message *plus the raw
 * source* — never a blank pane and never Mermaid's own injected error graphic.
 * The successful SVG comes from a strict-security-level engine (scripts/foreign
 * objects stripped) and is the only place this package injects markup.
 */
export interface MermaidProps {
  /** Mermaid diagram source (a version's `content`). */
  source: string;
  /**
   * Server already flagged this version `render_error` (plan §2.2). Seeds the
   * error state on first paint so a known-bad diagram never flashes as loading.
   */
  serverRenderError?: boolean;
  /** Injected engine (tests + integration). Defaults to the strict lazy loader. */
  engine?: MermaidEngine;
  className?: string;
}

type RenderState =
  | { status: "loading" }
  | { status: "ok"; svg: string }
  | { status: "error"; error: string };

export function Mermaid({ source, serverRenderError, engine, className }: MermaidProps) {
  const rawId = useId();
  // Mermaid uses the id as a DOM selector; React's useId contains ":" — strip it.
  const domId = `hc-mermaid-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  const [state, setState] = useState<RenderState>(
    serverRenderError
      ? { status: "error", error: "This diagram failed to render." }
      : { status: "loading" },
  );

  useEffect(() => {
    // The server parsed this diagram at write time and flagged it (plan §2.2):
    // trust that record and show the error + source without a client re-render.
    if (serverRenderError) return;

    let cancelled = false;
    setState({ status: "loading" });

    const run = async () => {
      let outcome: MermaidRenderOutcome;
      try {
        const eng = engine ?? (await loadStrictMermaidEngine());
        outcome = await eng.render(domId, source);
      } catch (err) {
        outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      if (cancelled) return;
      setState(
        outcome.ok
          ? { status: "ok", svg: outcome.svg }
          : { status: "error", error: outcome.error },
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [source, engine, domId, serverRenderError]);

  const rootClass = className ? `hc-mermaid ${className}` : "hc-mermaid";

  if (state.status === "loading") {
    return (
      <div className={rootClass} data-state="loading" aria-busy="true">
        <span className="hc-mermaid__loading">Rendering diagram…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={rootClass} data-state="error" role="group" aria-label="Diagram render error">
        <p className="hc-mermaid__error" role="alert">
          <span className="hc-mermaid__error-badge">Diagram failed to render</span>
          <span className="hc-mermaid__error-message">{state.error}</span>
        </p>
        <pre className="hc-mermaid__source">
          <code>{source}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className={rootClass}
      data-state="ok"
      // Strict-security-level Mermaid output (scripts/foreignObject stripped); this
      // is the sole markup-injection point in this package, gated by the engine.
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
