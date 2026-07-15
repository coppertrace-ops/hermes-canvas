import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./Markdown";

/**
 * Unsafe-Markdown stripping (plan §4). The renderer must never emit raw HTML,
 * never a `javascript:`/`data:` navigable link, and never load an external image
 * — the latter shows a visible blocked state carrying the URL instead.
 */
describe("Markdown — unsafe content is stripped, not executed", () => {
  it("renders raw <script> as inert text, never a <script> element", () => {
    const { container } = render(
      <Markdown source={`Hello\n\n<script>alert('xss')</script>`} />,
    );
    expect(container.querySelector("script")).toBeNull();
    // The literal characters survive as visible text (audit evidence).
    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });

  it("does not create an <img> for a raw HTML <img onerror> injection", () => {
    const { container } = render(
      <Markdown source={`<img src=x onerror="alert(1)">`} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("onerror");
  });

  it("neutralises a javascript: link — no navigable javascript href", () => {
    const { container } = render(<Markdown source={`[click me](javascript:alert(1))`} />);
    // No anchor with a javascript: scheme anywhere.
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    // The label still shows, marked as a blocked link.
    const blocked = container.querySelector(".hc-md__link-blocked");
    expect(blocked).not.toBeNull();
    expect(blocked?.getAttribute("data-blocked-reason")).toBe("unsafe-scheme");
    expect(screen.getByText("click me")).toBeInTheDocument();
  });

  it("blocks an external image and shows a visible blocked state with the URL", () => {
    const url = "https://evil.example/beacon.png";
    const { container } = render(<Markdown source={`![shot](${url})`} />);
    // Critically: no <img> is emitted, so no network fetch/beacon fires.
    expect(container.querySelector("img")).toBeNull();
    const blocked = container.querySelector(".hc-md__img-blocked");
    expect(blocked).not.toBeNull();
    expect(blocked?.getAttribute("data-blocked-reason")).toBe("external");
    expect(blocked?.getAttribute("data-blocked-url")).toBe(url);
    // The URL is visible to the human as audit evidence.
    expect(screen.getByText(url)).toBeInTheDocument();
  });

  it("still renders safe Markdown structure (heading + emphasis + safe link)", () => {
    const { container } = render(
      <Markdown source={`# Title\n\nSome **bold** and a [safe](https://example.com/x).`} />,
    );
    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    const link = container.querySelector('a[href="https://example.com/x"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute("rel")).toContain("noopener");
  });
});

/**
 * GFM table rendering — semantic <table> in the hc-md__* namespace, wrapped in a
 * scroll container, with alignment carried as inline text-align.
 */
describe("Markdown — GFM tables", () => {
  it("renders semantic table markup inside the scroll wrapper", () => {
    const { container } = render(
      <Markdown source={`| A | B |\n| --- | --- |\n| 1 | 2 |`} />,
    );
    expect(container.querySelector(".hc-md__table-wrap .hc-md__table")).not.toBeNull();
    const heads = container.querySelectorAll("thead th.hc-md__th");
    expect([...heads].map((h) => h.textContent)).toEqual(["A", "B"]);
    expect(heads[0]?.getAttribute("scope")).toBe("col");
    const cells = container.querySelectorAll("tbody td.hc-md__td");
    expect([...cells].map((c) => c.textContent)).toEqual(["1", "2"]);
  });

  it("applies per-column alignment as an inline text-align", () => {
    const { container } = render(
      <Markdown source={`| L | C | R |\n| :-- | :-: | --: |\n| a | b | c |`} />,
    );
    const heads = container.querySelectorAll<HTMLElement>("thead th");
    expect(heads[0]?.style.textAlign).toBe("left");
    expect(heads[1]?.style.textAlign).toBe("center");
    expect(heads[2]?.style.textAlign).toBe("right");
  });

  it("renders inline formatting inside cells", () => {
    const { container } = render(
      <Markdown source={`| H |\n| --- |\n| **bold** and \`code\` |`} />,
    );
    const cell = container.querySelector("tbody td");
    expect(cell?.querySelector("strong")?.textContent).toBe("bold");
    expect(cell?.querySelector("code.hc-md__code")?.textContent).toBe("code");
  });

  it("renders a malformed table as plain paragraph text, never throwing", () => {
    const { container } = render(<Markdown source={`| A | B |\nnot a delimiter`} />);
    expect(container.querySelector("table")).toBeNull();
    expect(container.textContent).toContain("| A | B |");
  });
});
