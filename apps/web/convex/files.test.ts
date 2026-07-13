import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, attachmentHeaders, sanitizeFilename } from "./files";

/**
 * Unit tests for the attachment header policy (COURIER). These assert the exact
 * download-only, un-sniffable response headers the Phase-2 gate (G2) requires — a
 * user-uploaded .html/.svg must be served as a download with nosniff, never inline.
 */

describe("sanitizeFilename", () => {
  it("passes a normal filename through", () => {
    expect(sanitizeFilename("report.pdf")).toBe("report.pdf");
  });

  it("strips CR/LF (header-injection defense)", () => {
    const injected = "evil.txt\r\nSet-Cookie: x=1";
    const out = sanitizeFilename(injected);
    expect(out).not.toContain("\r");
    expect(out).not.toContain("\n");
  });

  it("removes quotes and backslashes that would break the header", () => {
    expect(sanitizeFilename('a"b\\c.txt')).toBe("abc.txt");
  });

  it("replaces path separators", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe(".._.._etc_passwd");
  });

  it("falls back to a safe default for an empty name", () => {
    expect(sanitizeFilename("")).toBe("attachment");
    expect(sanitizeFilename("   ")).toBe("attachment");
  });

  it("caps length", () => {
    expect(sanitizeFilename("a".repeat(500)).length).toBe(255);
  });
});

describe("attachmentHeaders", () => {
  const headers = attachmentHeaders("index.html", 1234);

  it("forces a non-renderable content type so HTML/SVG cannot execute inline", () => {
    expect(headers["Content-Type"]).toBe("application/octet-stream");
  });

  it("sets nosniff so the browser cannot re-sniff to text/html", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("forces an attachment (download) disposition with the filename", () => {
    expect(headers["Content-Disposition"]).toContain("attachment;");
    expect(headers["Content-Disposition"]).toContain('filename="index.html"');
  });

  it("adds a belt-and-braces sandbox CSP", () => {
    expect(headers["Content-Security-Policy"]).toContain("sandbox");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
  });

  it("passes through the content length when provided", () => {
    expect(headers["Content-Length"]).toBe("1234");
  });

  it("RFC 5987-encodes a non-ASCII filename and keeps an ASCII fallback", () => {
    const h = attachmentHeaders("réçu.pdf");
    expect(h["Content-Disposition"]).toContain("filename*=UTF-8''");
    // ASCII fallback replaces non-ASCII with underscores, never raw bytes.
    expect(h["Content-Disposition"]).toMatch(/filename="r__u\.pdf"/);
  });

  it("names the 10 MiB policy cap", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(10 * 1024 * 1024);
  });
});
