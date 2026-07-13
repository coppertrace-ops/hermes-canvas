/**
 * Safe Markdown AST + policy types (PANES, plan §4).
 *
 * The renderer never emits raw HTML: Markdown is parsed into this closed set of
 * node types and rendered as React elements, so `dangerouslySetInnerHTML` is
 * never used on Markdown content. Any `<...>` in the source is carried as literal
 * text and escaped by React at render time — an injected `<script>` is inert.
 *
 * External images are surfaced as an explicit {@link ImageNode} with
 * `blocked: true`, never an `<img>` that loads: an exfil attempt becomes visible
 * audit evidence rather than a silent network beacon (the image-beacon channel
 * that leaked ≥7 major products, per plan §4).
 */

/** Why a link/image URL was neutralised, for the visible blocked state. */
export type BlockReason = "external" | "unsafe-scheme";

export interface TextNode {
  type: "text";
  value: string;
}

export interface EmphasisNode {
  type: "emphasis";
  strong: boolean;
  children: InlineNode[];
}

export interface CodeSpanNode {
  type: "code";
  value: string;
}

export interface LinkNode {
  type: "link";
  /** Safe href, or `null` when the scheme was rejected (rendered as plain text). */
  href: string | null;
  blockedReason?: BlockReason;
  children: InlineNode[];
}

export interface ImageNode {
  type: "image";
  alt: string;
  /** The declared source, kept for the visible blocked state even when blocked. */
  url: string;
  /** Safe, loadable src, or `null` when blocked (external or unsafe scheme). */
  src: string | null;
  blocked: boolean;
  blockedReason?: BlockReason;
}

export type InlineNode = TextNode | EmphasisNode | CodeSpanNode | LinkNode | ImageNode;

export interface HeadingNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

export interface ParagraphNode {
  type: "paragraph";
  children: InlineNode[];
}

export interface CodeBlockNode {
  type: "codeBlock";
  lang: string | null;
  value: string;
}

export interface ListNode {
  type: "list";
  ordered: boolean;
  items: InlineNode[][];
}

export interface BlockquoteNode {
  type: "blockquote";
  children: BlockNode[];
}

export interface ThematicBreakNode {
  type: "thematicBreak";
}

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | CodeBlockNode
  | ListNode
  | BlockquoteNode
  | ThematicBreakNode;

/**
 * Sanitizer configuration. Defaults are the strict plan §4 posture; WARDEN owns
 * the authoritative policy and will supply it from `@hermes/policy` at
 * integration — this interface is the seam that consumption plugs into.
 */
export interface MarkdownPolicy {
  /** URL schemes permitted for links. Everything else renders as plain text. */
  linkSchemes: readonly string[];
  /**
   * When true, any http/https/protocol-relative image is blocked and shown as a
   * visible "external image blocked" state with its URL, never loaded.
   */
  blockExternalImages: boolean;
  /** Non-remote image schemes allowed to load (e.g. relative paths). */
  imageSchemes: readonly string[];
}

/** Strict default posture (plan §4). WARDEN may tighten via @hermes/policy. */
export const DEFAULT_MARKDOWN_POLICY: MarkdownPolicy = {
  linkSchemes: ["http", "https", "mailto"],
  blockExternalImages: true,
  imageSchemes: [],
};
