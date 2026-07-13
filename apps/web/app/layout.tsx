import type { ReactNode } from "react";

export const metadata = {
  title: "Hermes Canvas",
  description: "Authenticated workspace for a human and the Hermes agent.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
