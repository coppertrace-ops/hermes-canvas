import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  attachmentStatusTone,
  canSendDraft,
  formatBytes,
  guardAttachment,
  isImageMime,
} from "./attachments";
import type { AttachmentView } from "./types";

const view = (over: Partial<AttachmentView>): AttachmentView => ({
  id: "a1",
  name: "f",
  mime: "text/plain",
  size: 1,
  status: "ready",
  ...over,
});

describe("guardAttachment (10 MB client guard)", () => {
  it("accepts a normal file under the cap", () => {
    expect(guardAttachment({ name: "a.png", size: 1024, type: "image/png" })).toEqual({ ok: true });
  });

  it("rejects an empty (0-byte) file with a named reason", () => {
    const r = guardAttachment({ name: "empty.txt", size: 0, type: "text/plain" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("empty");
      expect(r.message).toContain("empty.txt");
    }
  });

  it("rejects a file exactly one byte over the 10 MB cap", () => {
    const r = guardAttachment({
      name: "big.bin",
      size: MAX_ATTACHMENT_BYTES + 1,
      type: "application/octet-stream",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("oversize");
      // The limit is named in the message (plan §2.2: never a silent truncation).
      expect(r.message).toContain("10 MB");
      expect(r.message).toContain("big.bin");
    }
  });

  it("accepts a file exactly at the cap (boundary is inclusive)", () => {
    expect(guardAttachment({ name: "edge.bin", size: MAX_ATTACHMENT_BYTES, type: "x" })).toEqual({
      ok: true,
    });
  });

  it("uses the policy limit of 10 MiB", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("formatBytes", () => {
  it("formats across unit boundaries", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("returns a dash for nonsense input", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("isImageMime", () => {
  it("matches raster image types only", () => {
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("image/jpeg")).toBe(true);
    // SVG is deliberately excluded — it is an active-content format, never previewed inline.
    expect(isImageMime("image/svg+xml")).toBe(false);
    expect(isImageMime("text/html")).toBe(false);
    expect(isImageMime("application/octet-stream")).toBe(false);
  });
});

describe("attachmentStatusTone", () => {
  it("maps each lifecycle state to a status tone", () => {
    expect(attachmentStatusTone("ready")).toBe("success");
    expect(attachmentStatusTone("error")).toBe("danger");
    expect(attachmentStatusTone("uploading")).toBe("info");
    expect(attachmentStatusTone("pending")).toBe("neutral");
  });
});

describe("canSendDraft", () => {
  it("allows text with no attachments", () => {
    expect(canSendDraft("hello", [])).toBe(true);
  });

  it("blocks an empty draft", () => {
    expect(canSendDraft("   ", [])).toBe(false);
  });

  it("blocks while any attachment is still uploading", () => {
    expect(canSendDraft("hi", [view({ status: "uploading" })])).toBe(false);
  });

  it("blocks while any attachment has errored", () => {
    expect(canSendDraft("hi", [view({ status: "error" })])).toBe(false);
  });

  it("allows an attachment-only send once every attachment is ready", () => {
    expect(canSendDraft("", [view({ status: "ready" })])).toBe(true);
  });
});
