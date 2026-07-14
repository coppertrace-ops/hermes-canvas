import type { ReactNode } from "react";

export const metadata = {
  title: "Hermes Canvas — Content Origin",
  description: "Isolated origin that serves sandboxed artifact HTML.",
};

/**
 * Minimal shell document. No imported CSS (so no stylesheet link is emitted — the
 * content CSP is `style-src 'unsafe-inline'` only), and a zeroed body margin so the
 * reported `scrollHeight` reflects the artifact, not chrome.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
