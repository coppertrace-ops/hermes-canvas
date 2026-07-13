import type { ReactNode } from "react";

export const metadata = {
  title: "Hermes Canvas — Content Origin",
  description: "Isolated origin that serves sandboxed artifact HTML.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
