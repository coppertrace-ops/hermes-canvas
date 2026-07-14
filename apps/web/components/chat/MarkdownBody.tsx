"use client";

/**
 * MarkdownBody — sanitized agent message rendering for Hermes Canvas.
 * No rehype-raw. CSP-safe: block javascript: links; strip remote images (beacon risk).
 *
 * Body text renders at the base reading size (the sm size the owner flagged as too
 * small is reserved for metadata). GFM tables get real cell styling inside a
 * horizontal-scroll wrapper so wide tables never blow out the pane. Fenced code
 * blocks carry a hover copy affordance.
 */

import type { CSSProperties, ReactNode } from "react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { CopyButton } from "./CopyButton";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ["className"]],
    span: [...(defaultSchema.attributes?.span || []), ["className"]],
  },
};

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const t = href.trim().toLowerCase();
  if (t.startsWith("javascript:") || t.startsWith("data:text/html")) return undefined;
  return href;
}

const preStyle: CSSProperties = {
  margin: 0,
  padding: "var(--hc-space-2)",
  overflowX: "auto",
  borderRadius: "var(--hc-radius-md)",
  background: "var(--hc-surface-sunken, var(--hc-surface))",
  border: "var(--hc-border-width) solid var(--hc-border)",
  fontSize: "0.85em",
  lineHeight: 1.45,
};

const inlineCodeStyle: CSSProperties = {
  fontFamily: "var(--hc-font-mono, ui-monospace, monospace)",
  fontSize: "0.9em",
  padding: "0.1em 0.35em",
  borderRadius: "var(--hc-radius-sm, 4px)",
  background: "var(--hc-surface-sunken, rgba(127,127,127,0.15))",
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
  margin: "0 0 0.5em",
  maxWidth: "100%",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: "0.95em",
};

const cellStyle: CSSProperties = {
  border: "var(--hc-border-width) solid var(--hc-border)",
  padding: "var(--hc-space-1) var(--hc-space-2)",
  textAlign: "left",
  verticalAlign: "top",
};

const headerCellStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: "var(--hc-weight-semibold, 600)",
  background: "var(--hc-surface-sunken, var(--hc-surface))",
};

/** A fenced code block with a hover copy button reading the rendered text. */
function CodeBlockPre({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <pre ref={ref} style={preStyle}>
        {children}
      </pre>
      <CopyButton
        text={() => ref.current?.textContent ?? ""}
        visible={hovered}
        label="Copy"
        style={{ position: "absolute", top: "var(--hc-space-1)", right: "var(--hc-space-1)" }}
      />
    </div>
  );
}

export function MarkdownBody({ children }: { children: string }) {
  return (
    <div
      className="hc-md"
      style={{
        wordBreak: "break-word",
        lineHeight: 1.5,
        fontSize: "var(--hc-font-size-base, 0.9375rem)",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children: c }) => {
            const safe = safeHref(href);
            if (!safe) return <span>{c}</span>;
            return (
              <a href={safe} target="_blank" rel="noopener noreferrer">
                {c}
              </a>
            );
          },
          img: () => null, // block remote image beacons; attachments use chips
          pre: ({ children: c }) => <CodeBlockPre>{c}</CodeBlockPre>,
          code: ({ className, children: c, ...props }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className={className} style={{ fontFamily: "var(--hc-font-mono, ui-monospace, monospace)" }} {...props}>
                  {c}
                </code>
              );
            }
            return (
              <code style={inlineCodeStyle} {...props}>
                {c}
              </code>
            );
          },
          p: ({ children: c }) => <p style={{ margin: "0 0 0.5em" }}>{c}</p>,
          ul: ({ children: c }) => <ul style={{ margin: "0 0 0.5em", paddingLeft: "1.25em" }}>{c}</ul>,
          ol: ({ children: c }) => <ol style={{ margin: "0 0 0.5em", paddingLeft: "1.25em" }}>{c}</ol>,
          table: ({ children: c }) => (
            <div style={tableWrap}>
              <table style={tableStyle}>{c}</table>
            </div>
          ),
          th: ({ children: c }) => <th style={headerCellStyle}>{c}</th>,
          td: ({ children: c }) => <td style={cellStyle}>{c}</td>,
          blockquote: ({ children: c }) => (
            <blockquote
              style={{
                margin: "0 0 0.5em",
                paddingLeft: "var(--hc-space-3)",
                borderLeft: "3px solid var(--hc-border)",
                color: "var(--hc-text-secondary)",
              }}
            >
              {c}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
