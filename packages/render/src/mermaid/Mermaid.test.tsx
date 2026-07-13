import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mermaid } from "./Mermaid";
import type { MermaidEngine } from "./engine";

/**
 * Invalid-Mermaid visible failure (plan §2.2 / §4): a parse/render failure must
 * surface an inline error *and* the raw source — never a blank pane, never
 * Mermaid's own injected error graphic. Tests inject a deterministic engine so
 * no real Mermaid/DOM rendering is needed.
 */
const failingEngine: MermaidEngine = {
  render: async () => ({ ok: false, error: "Parse error on line 1: unexpected token 'notadiagram'" }),
};

const okEngine: MermaidEngine = {
  render: async () => ({ ok: true, svg: "<svg data-testid='diagram'><g></g></svg>" }),
};

describe("Mermaid — invalid diagrams fail visibly", () => {
  it("shows an inline error and the raw source when rendering fails", async () => {
    const source = "graph TD; notadiagram <<<";
    render(<Mermaid source={source} engine={failingEngine} />);

    // Error message is announced and visible.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/failed to render/i);
    expect(alert).toHaveTextContent(/Parse error on line 1/);

    // The raw source is shown alongside the error (never hidden).
    expect(screen.getByText(source)).toBeInTheDocument();
  });

  it("marks the container as errored and never injects an <svg> on failure", async () => {
    const { container } = render(<Mermaid source="bad" engine={failingEngine} />);
    await screen.findByRole("alert");
    expect(container.querySelector('[data-state="error"]')).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders the diagram SVG on success", async () => {
    const { container } = render(<Mermaid source="graph TD; A-->B" engine={okEngine} />);
    await screen.findByTestId("diagram");
    expect(container.querySelector('[data-state="ok"]')).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("honours a server-flagged render_error before the engine resolves", () => {
    // No engine result yet — the server hint drives an immediate error state.
    render(<Mermaid source="whatever" serverRenderError engine={{ render: () => new Promise(() => {}) }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/failed to render/i);
    expect(screen.getByText("whatever")).toBeInTheDocument();
  });
});
