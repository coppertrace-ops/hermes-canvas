import { describe, expect, it } from "vitest";
import { FLAG_KEYS, flagsAllOff, isFlagKey, normalizeFlags } from "./flags";

describe("flag key set", () => {
  it("is the closed Wave 2 set", () => {
    expect([...FLAG_KEYS]).toEqual(["html_artifacts", "boards", "jobs_tab"]);
  });

  it("isFlagKey accepts known keys and rejects everything else", () => {
    expect(isFlagKey("boards")).toBe(true);
    expect(isFlagKey("html_artifacts")).toBe(true);
    expect(isFlagKey("nope")).toBe(false);
    expect(isFlagKey("")).toBe(false);
  });
});

describe("flagsAllOff", () => {
  it("returns every flag off, as a fresh object each call", () => {
    const a = flagsAllOff();
    const b = flagsAllOff();
    expect(a).toEqual({ html_artifacts: false, boards: false, jobs_tab: false });
    expect(a).not.toBe(b); // never a shared/mutated singleton
  });
});

describe("normalizeFlags", () => {
  it("treats undefined (loading / demo) as all off", () => {
    expect(normalizeFlags(undefined)).toEqual({
      html_artifacts: false,
      boards: false,
      jobs_tab: false,
    });
  });

  it("only true is on; missing and non-true default off", () => {
    expect(normalizeFlags({ html_artifacts: true })).toEqual({
      html_artifacts: true,
      boards: false,
      jobs_tab: false,
    });
  });

  it("ignores unknown keys in the input", () => {
    expect(normalizeFlags({ boards: true, bogus: true } as Record<string, boolean>)).toEqual({
      html_artifacts: false,
      boards: true,
      jobs_tab: false,
    });
  });
});
