import { Fragment } from "react";
import type { ReactNode } from "react";
import type {
  BlockNode,
  InlineNode,
  MarkdownPolicy,
} from "./types";
import { DEFAULT_MARKDOWN_POLICY } from "./types";
import { parseMarkdown } from "./sanitize";

/**
 * Safe Markdown renderer (PANES, plan §4).
 *
 * Renders agent/human Markdown as React elements only — `dangerouslySetInnerHTML`
 * is never used here, so there is no HTML injection surface: a raw `<script>` in
 * the source is escaped to inert text by React. Link schemes are restricted and
 * external images are shown as a visible "blocked" state (with the target URL)
 * instead of loading — an exfil attempt becomes audit evidence, never a beacon.
 *
 * The sanitizer posture is supplied via {@link MarkdownPolicy}; the default is the
 * strict plan §4 stance and WARDEN's `@hermes/policy` config is the seam that
 * later overrides it.
 */
export interface MarkdownProps {
  /** Raw Markdown source (as stored in a version's `content`). */
  source: string;
  /** Sanitizer/link/image policy. Defaults to the strict plan §4 posture. */
  policy?: MarkdownPolicy;
  className?: string;
}

export function Markdown({ source, policy = DEFAULT_MARKDOWN_POLICY, className }: MarkdownProps) {
  const blocks = parseMarkdown(source, policy);
  return (
    <div className={className ? `hc-md ${className}` : "hc-md"}>
      {blocks.map((block, i) => (
        <BlockView key={i} node={block} />
      ))}
    </div>
  );
}

function BlockView({ node }: { node: BlockNode }): ReactNode {
  switch (node.type) {
    case "heading": {
      const Tag = `h${node.level}` as const;
      return <Tag className="hc-md__heading">{renderInline(node.children)}</Tag>;
    }
    case "paragraph":
      return <p className="hc-md__p">{renderInline(node.children)}</p>;
    case "codeBlock":
      return (
        <pre className="hc-md__pre" data-lang={node.lang ?? undefined}>
          <code>{node.value}</code>
        </pre>
      );
    case "list":
      return node.ordered ? (
        <ol className="hc-md__ol">
          {node.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul className="hc-md__ul">
          {node.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "blockquote":
      return (
        <blockquote className="hc-md__quote">
          {node.children.map((child, i) => (
            <BlockView key={i} node={child} />
          ))}
        </blockquote>
      );
    case "thematicBreak":
      return <hr className="hc-md__hr" />;
  }
}

function renderInline(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, i) => <InlineView key={i} node={node} />);
}

function InlineView({ node }: { node: InlineNode }): ReactNode {
  switch (node.type) {
    case "text":
      // React escapes this — any raw `<...>` becomes inert visible text.
      return <Fragment>{node.value}</Fragment>;
    case "code":
      return <code className="hc-md__code">{node.value}</code>;
    case "emphasis":
      return node.strong ? (
        <strong>{renderInline(node.children)}</strong>
      ) : (
        <em>{renderInline(node.children)}</em>
      );
    case "link":
      // A rejected scheme yields href=null → render the label as plain text,
      // never a navigable `javascript:`/`data:` link.
      if (node.href === null) {
        return (
          <span className="hc-md__link-blocked" data-blocked-reason={node.blockedReason}>
            {renderInline(node.children)}
          </span>
        );
      }
      return (
        <a className="hc-md__link" href={node.href} rel="noreferrer noopener" target="_blank">
          {renderInline(node.children)}
        </a>
      );
    case "image":
      if (node.blocked) {
        // Visible blocked state — shows the target URL as audit evidence and
        // deliberately does NOT emit an <img> that would fetch it (plan §4).
        return (
          <span
            className="hc-md__img-blocked"
            role="img"
            aria-label={node.alt ? `Blocked image: ${node.alt}` : "Blocked external image"}
            data-blocked-reason={node.blockedReason}
            data-blocked-url={node.url}
            title={node.url}
          >
            <span className="hc-md__img-blocked-label">
              {node.blockedReason === "external"
                ? "External image blocked"
                : "Image blocked (unsafe scheme)"}
            </span>
            <code className="hc-md__img-blocked-url">{node.url}</code>
          </span>
        );
      }
      return <img className="hc-md__img" src={node.src ?? undefined} alt={node.alt} />;
  }
}
