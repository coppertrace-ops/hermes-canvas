import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

/**
 * Structural-class coverage guard (design-uplift deliverable).
 *
 * The product's hero surfaces (Markdown prose, the split-pane handle, artifact
 * states, Mermaid, the canvas tab bar and artifact rail) reference ~40 `hc-`
 * classes that are DEFINED IN NO STYLESHEET unless someone authors them — the
 * exact regression this repo just recovered from, where those surfaces rendered
 * at browser defaults.
 *
 * This test re-derives the reference/definition sets from source on every run
 * and fails if any structural class a component names lacks a rule in the shipped
 * `@hermes/ui` sheets (or the app's globals). It is the executable half of the
 * className↔CSS coverage contract documented in docs/design-language.md.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Directories whose `.tsx` reference `hc-` classes we are contractually on the hook for. */
const REFERENCE_DIRS = [
  "packages/render/src",
  "packages/ui/src/components",
  "apps/web/components/canvas",
  "apps/web/components/history",
  "apps/web/components/integration",
  "apps/web/app/(auth)",
];

/** Sheets that ship as `@hermes/ui/styles.css` plus the app frame's globals. */
const DEFINITION_FILES = [
  "packages/ui/src/styles/tokens.css",
  "packages/ui/src/styles/base.css",
  "packages/ui/src/styles/components.css",
  "packages/ui/src/styles/canvas.css",
  "apps/web/app/globals.css",
];

// A fully-formed BEM-ish class token: base (hyphenated) + optional __element +
// optional --modifier. Trailing `--`/`-` (from `hc-x--${dynamic}`) never matches,
// so a dynamic classname degrades to its static base rather than a phantom token.
const CLASS_TOKEN =
  /hc-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?/g;
// String/template literals inside a className expression.
const STRING_LITERAL = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;

/**
 * The class-value region of every `className=` in a file: the quoted string, or
 * the balanced `{…}` expression (cx(...), ternary, template literal). Reading ONLY
 * these regions means a `storageKey="hc-…"`, a `data-*`, or an aria label can
 * never be misread as a class reference — the false positives the coverage
 * contract must not raise.
 */
function classNameRegions(src: string): string[] {
  const regions: string[] = [];
  const at = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = at.exec(src)) !== null) {
    const start = m.index + m[0].length;
    const ch = src[start];
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, start + 1);
      if (end !== -1) regions.push(src.slice(start, end + 1));
    } else if (ch === "{") {
      let depth = 0;
      let j = start;
      for (; j < src.length; j++) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}" && --depth === 0) {
          j++;
          break;
        }
      }
      regions.push(src.slice(start, j));
    }
  }
  return regions;
}

function walkTsx(absDir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = join(absDir, entry);
    if (statSync(abs).isDirectory()) {
      out = out.concat(walkTsx(abs));
    } else if (entry.endsWith(".tsx") && !entry.includes(".test.")) {
      out.push(abs);
    }
  }
  return out;
}

function referencedClasses(): Map<string, string> {
  // class -> first file that references it (for a legible failure message).
  const refs = new Map<string, string>();
  for (const dir of REFERENCE_DIRS) {
    for (const file of walkTsx(join(REPO_ROOT, dir))) {
      const src = readFileSync(file, "utf8");
      for (const region of classNameRegions(src)) {
        for (const lit of region.matchAll(STRING_LITERAL)) {
          const body = lit[1] ?? lit[2] ?? lit[3] ?? "";
          if (!body.includes("hc-")) continue;
          for (const m of body.matchAll(CLASS_TOKEN)) {
            // Skip CSS custom-property references (`var(--hc-…)`): a `-` immediately
            // before the match means this is a token variable, not a class name.
            if (m.index > 0 && body[m.index - 1] === "-") continue;
            if (!refs.has(m[0])) refs.set(m[0], file.slice(REPO_ROOT.length + 1));
          }
        }
      }
    }
  }
  return refs;
}

function definedClasses(): Set<string> {
  const defs = new Set<string>();
  const selector = new RegExp("\\." + CLASS_TOKEN.source, "g");
  for (const rel of DEFINITION_FILES) {
    const css = readFileSync(join(REPO_ROOT, rel), "utf8");
    for (const m of css.matchAll(selector)) defs.add(m[0].slice(1));
  }
  return defs;
}

describe("structural hc-* classes are all backed by a CSS rule", () => {
  it("has no orphaned classnames across the owned surfaces", () => {
    const refs = referencedClasses();
    const defs = definedClasses();

    const orphans = [...refs.entries()]
      .filter(([cls]) => !defs.has(cls))
      .map(([cls, file]) => `${cls}  (referenced in ${file})`)
      .sort();

    expect(orphans, `Orphaned classnames (no CSS rule):\n${orphans.join("\n")}`).toEqual([]);
  });

  it("actually scanned the hero surfaces (guards against a silently-empty sweep)", () => {
    const refs = referencedClasses();
    // Canaries from each critical namespace; if the scanner ever stops finding
    // these, the coverage assertion above would pass vacuously.
    for (const canary of [
      "hc-md",
      "hc-split__separator",
      "hc-artifact-state",
      "hc-tabbar",
      "hc-canvas__rail",
      "hc-version-timeline",
      "hc-md-diff",
    ]) {
      expect(refs.has(canary), `expected to find a reference to ${canary}`).toBe(true);
    }
  });

  it("does not mistake non-className `hc-` strings for class references", () => {
    // `storageKey="hc-chat-canvas-split"` is a localStorage key, not a class —
    // the scanner reads className regions only, so it must never appear.
    const refs = referencedClasses();
    expect(refs.has("hc-chat-canvas-split")).toBe(false);
  });
});
