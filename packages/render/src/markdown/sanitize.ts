import type {
  BlockNode,
  InlineNode,
  LinkNode,
  ImageNode,
  MarkdownPolicy,
} from "./types";
import { DEFAULT_MARKDOWN_POLICY } from "./types";

/**
 * A minimal, safe Markdown parser (PANES, plan §4).
 *
 * Design invariant: this produces a closed AST (see ./types) that the renderer
 * maps to React elements. There is deliberately no HTML pass-through — any raw
 * `<...>` in the input is treated as literal text, so the classic
 * `<script>`/`<img onerror>` injections are inert once React escapes the text.
 * Link and image URLs are classified against {@link MarkdownPolicy}; unsafe
 * schemes (`javascript:`, `data:`, `vbscript:`, …) are stripped and external
 * images are flagged blocked rather than loaded.
 *
 * Scope is an intentional Markdown subset (headings, paragraphs, lists,
 * blockquotes, fenced code, thematic breaks; inline code, emphasis, links,
 * images). Anything unrecognised degrades to text — never to markup.
 */

/** Extract a lowercase URL scheme (`javascript`, `https`, …) or null if none. */
function schemeOf(url: string): string | null {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url.trim());
  return m ? m[1]!.toLowerCase() : null;
}

/** Protocol-relative (`//host/...`) URLs are remote and treated as external. */
function isProtocolRelative(url: string): boolean {
  return /^\/\//.test(url.trim());
}

function isRemote(url: string): boolean {
  const s = schemeOf(url);
  return s === "http" || s === "https" || isProtocolRelative(url);
}

/** Resolve a link URL to a safe href (or null → render as plain text). */
function classifyLink(
  url: string,
  policy: MarkdownPolicy,
): { href: string | null; reason?: LinkNode["blockedReason"] } {
  const scheme = schemeOf(url);
  if (scheme === null) {
    // Relative URL or fragment — no scheme to abuse; permit.
    return { href: url };
  }
  if (policy.linkSchemes.includes(scheme)) {
    return { href: url };
  }
  return { href: null, reason: "unsafe-scheme" };
}

/** Resolve an image URL to a loadable src (or block it, keeping the URL). */
function classifyImage(
  url: string,
  policy: MarkdownPolicy,
): Pick<ImageNode, "src" | "blocked" | "blockedReason"> {
  const scheme = schemeOf(url);
  // Any non-http(s) scheme not explicitly allowed (javascript:, data:, blob:, …)
  // is never loaded — the primary injection vector.
  if (scheme !== null && scheme !== "http" && scheme !== "https" && !policy.imageSchemes.includes(scheme)) {
    return { src: null, blocked: true, blockedReason: "unsafe-scheme" };
  }
  // Remote images (http/https/protocol-relative) are blocked as exfil beacons.
  if (policy.blockExternalImages && isRemote(url)) {
    return { src: null, blocked: true, blockedReason: "external" };
  }
  return { src: url, blocked: false };
}

// --- Inline parsing ----------------------------------------------------------

const IMAGE_RE = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/;
const LINK_RE = /\[([^\]]+)\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/;
const CODE_RE = /`([^`]+)`/;
const STRONG_RE = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/;
const EM_RE = /(\*|_)(?=\S)([\s\S]*?\S)\1/;

/** Strip optional angle brackets around a Markdown URL destination. */
function unwrapUrl(raw: string): string {
  const t = raw.trim();
  return t.startsWith("<") && t.endsWith(">") ? t.slice(1, -1) : t;
}

interface Match {
  index: number;
  length: number;
  node: InlineNode;
}

function firstMatch(text: string, policy: MarkdownPolicy): Match | null {
  let best: Match | null = null;
  const consider = (m: Match | null) => {
    if (m && (best === null || m.index < best.index)) best = m;
  };

  const img = IMAGE_RE.exec(text);
  if (img) {
    const url = unwrapUrl(img[2]!);
    const cls = classifyImage(url, policy);
    consider({
      index: img.index,
      length: img[0].length,
      node: { type: "image", alt: img[1] ?? "", url, ...cls },
    });
  }

  const link = LINK_RE.exec(text);
  if (link) {
    const url = unwrapUrl(link[2]!);
    const cls = classifyLink(url, policy);
    consider({
      index: link.index,
      length: link[0].length,
      node: {
        type: "link",
        href: cls.href,
        blockedReason: cls.reason,
        children: parseInline(link[1] ?? "", policy),
      },
    });
  }

  const code = CODE_RE.exec(text);
  if (code) {
    consider({
      index: code.index,
      length: code[0].length,
      node: { type: "code", value: code[1] ?? "" },
    });
  }

  const strong = STRONG_RE.exec(text);
  if (strong) {
    consider({
      index: strong.index,
      length: strong[0].length,
      node: { type: "emphasis", strong: true, children: parseInline(strong[2] ?? "", policy) },
    });
  }

  const em = EM_RE.exec(text);
  if (em) {
    consider({
      index: em.index,
      length: em[0].length,
      node: { type: "emphasis", strong: false, children: parseInline(em[2] ?? "", policy) },
    });
  }

  return best;
}

/** Parse inline Markdown into safe inline nodes. Text (incl. raw `<...>`) is literal. */
export function parseInline(text: string, policy: MarkdownPolicy = DEFAULT_MARKDOWN_POLICY): InlineNode[] {
  const out: InlineNode[] = [];
  let rest = text;
  // Bounded loop: every branch consumes ≥1 char of `rest`.
  while (rest.length > 0) {
    const m = firstMatch(rest, policy);
    if (!m) {
      out.push({ type: "text", value: rest });
      break;
    }
    if (m.index > 0) {
      out.push({ type: "text", value: rest.slice(0, m.index) });
    }
    out.push(m.node);
    rest = rest.slice(m.index + m.length);
  }
  return out;
}

// --- Block parsing -----------------------------------------------------------

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^(```|~~~)\s*([\w-]+)?\s*$/;
const HR_RE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const UL_RE = /^\s*[-*+]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;

/** Parse a Markdown document into a safe block AST. */
export function parseMarkdown(
  input: string,
  policy: MarkdownPolicy = DEFAULT_MARKDOWN_POLICY,
): BlockNode[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length === 0) return;
    blocks.push({ type: "paragraph", children: parseInline(buf.join(" ").trim(), policy) });
    buf.length = 0;
  };

  const para: string[] = [];

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block — raw, never parsed for inline markup.
    const fence = FENCE_RE.exec(line);
    if (fence) {
      flushParagraph(para);
      const marker = fence[1]!;
      const lang = fence[2] ?? null;
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i]!.trimEnd() !== marker) {
        body.push(lines[i]!);
        i++;
      }
      i++; // consume closing fence (or EOF)
      blocks.push({ type: "codeBlock", lang, value: body.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph(para);
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      flushParagraph(para);
      blocks.push({ type: "thematicBreak" });
      i++;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph(para);
      const level = heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: "heading", level, children: parseInline(heading[2] ?? "", policy) });
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      flushParagraph(para);
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i]!)) {
        quoted.push(QUOTE_RE.exec(lines[i]!)![1] ?? "");
        i++;
      }
      blocks.push({ type: "blockquote", children: parseMarkdown(quoted.join("\n"), policy) });
      continue;
    }

    if (UL_RE.test(line) || OL_RE.test(line)) {
      flushParagraph(para);
      const ordered = OL_RE.test(line);
      const re = ordered ? OL_RE : UL_RE;
      const items: InlineNode[][] = [];
      while (i < lines.length && re.test(lines[i]!)) {
        items.push(parseInline(re.exec(lines[i]!)![1] ?? "", policy));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    para.push(line);
    i++;
  }
  flushParagraph(para);
  return blocks;
}
