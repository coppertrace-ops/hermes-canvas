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
