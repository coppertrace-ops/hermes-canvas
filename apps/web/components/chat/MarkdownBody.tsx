"use client";

/**
 * MarkdownBody — sanitized agent/human message rendering for Hermes Canvas.
 * No rehype-raw. CSP-safe: block javascript: links; strip remote images (beacon risk).
 */

import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

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

export function MarkdownBody({ children }: { children: string }) {
  return (
    <div
      className="hc-md"
      style={{
        wordBreak: "break-word",
        lineHeight: 1.5,
        fontSize: "var(--hc-font-size-sm, 0.9375rem)",
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
          pre: ({ children: c }) => <pre style={preStyle}>{c}</pre>,
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
