import { describe, expect, it } from "vitest";
import { ATTACHMENT_HEADERS } from "./attachments";
import { LIMITS } from "./limits";
import { FORBIDDEN_SANDBOX_TOKENS, FRAME_SANDBOX_ATTR } from "./sandbox";
import { MARKDOWN_SANITIZER_POLICY, MERMAID_SECURITY_LEVEL } from "./sanitizer";
import { POLICY_VERSION } from "./index";

describe("sandbox attribute", () => {
  it("grants ONLY allow-scripts", () => {
    expect(FRAME_SANDBOX_ATTR).toBe("allow-scripts");
  });

  it("contains none of the forbidden escape/exfil tokens (esp. allow-same-origin)", () => {
    expect(FORBIDDEN_SANDBOX_TOKENS).toContain("allow-same-origin");
    for (const token of FORBIDDEN_SANDBOX_TOKENS) {
      expect(FRAME_SANDBOX_ATTR).not.toContain(token);
    }
  });
});

describe("attachment headers", () => {
  it("force download-only, nosniff", () => {
    expect(ATTACHMENT_HEADERS["Content-Type"]).toBe("application/octet-stream");
    expect(ATTACHMENT_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(ATTACHMENT_HEADERS["Content-Disposition"]).toBe("attachment");
  });
});

describe("sanitizer policy", () => {
  it("is the strict plan §4 posture", () => {
    expect(MARKDOWN_SANITIZER_POLICY.linkSchemes).toEqual(["http", "https", "mailto"]);
    expect(MARKDOWN_SANITIZER_POLICY.blockExternalImages).toBe(true);
    expect(MARKDOWN_SANITIZER_POLICY.imageSchemes).toEqual([]); // no remote image fetch
    expect(MERMAID_SECURITY_LEVEL).toBe("strict");
  });
});

describe("limits", () => {
  it("keeps the existing byte caps stable", () => {
    expect(LIMITS.maxVersionBytes).toBe(256 * 1024);
    expect(LIMITS.maxAttachmentBytes).toBe(10 * 1024 * 1024);
    expect(LIMITS.maxMessageBytes).toBe(32 * 1024);
  });

  it("defines the jobs overdue grace constants", () => {
    expect(LIMITS.JOBS_GRACE_MIN_MS).toBe(10 * 60 * 1000);
    expect(LIMITS.JOBS_GRACE_FRACTION).toBe(0.25);
  });
});

describe("policy version", () => {
  it("is bumped off the pre-G2 stub", () => {
    expect(POLICY_VERSION).not.toBe("0.0.0-pre-g2");
    expect(POLICY_VERSION).toBe("1.0.0-g5");
  });
});
