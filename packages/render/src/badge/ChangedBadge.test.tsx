import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangedBadge } from "./ChangedBadge";

/**
 * Tab changed-badge rendering (plan §3, "changed since you last looked").
 * The badge is the load-bearing legibility signal: it must appear with an
 * accurate count + accessible label when there are unseen changes, and must
 * render *nothing* (never a stale "0") when there are none.
 */
describe("ChangedBadge — the tab changed indicator", () => {
  it("renders an accent count badge for a tab with unseen changes", () => {
    const { container } = render(<ChangedBadge count={3} label="Design notes" />);
    const badge = container.querySelector("[data-changed-count]");
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("data-changed-count")).toBe("3");
    expect(badge?.textContent).toBe("3");
    // Meaning is not color-only — an accessible label spells it out.
    expect(screen.getByLabelText("Design notes: 3 unseen changes")).toBeInTheDocument();
  });

  it("renders nothing when the count is zero (no stale badge)", () => {
    const { container } = render(<ChangedBadge count={0} label="Empty tab" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for negative counts (defensive)", () => {
    const { container } = render(<ChangedBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it("caps large counts at 99+", () => {
    const { container } = render(<ChangedBadge count={250} />);
    expect(container.querySelector("[data-changed-count]")?.textContent).toBe("99+");
  });

  it("uses the singular form for a single change", () => {
    render(<ChangedBadge count={1} label="Notes" />);
    expect(screen.getByLabelText("Notes: 1 unseen change")).toBeInTheDocument();
  });

  it("renders a numberless status dot in dot mode (per-artifact use)", () => {
    const { container } = render(<ChangedBadge count={1} dot label="Spec" />);
    // No count badge; a labelled status dot instead.
    expect(container.querySelector("[data-changed-count]")).toBeNull();
    expect(screen.getByLabelText("Spec: 1 unseen change")).toBeInTheDocument();
    expect(container.querySelector(".hc-status-dot")).not.toBeNull();
  });
});
