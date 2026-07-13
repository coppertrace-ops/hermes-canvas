import type { ReactNode } from "react";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { createThemeInitScript } from "@hermes/ui/theme";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Convex Auth needs its server provider (cookie/token handling) above the client
 * provider — but only when there is a Convex deployment to authenticate against.
 * A Convex-less local/demo build renders without it (matches `providers.tsx`).
 */
const authWired = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

export const metadata = {
  title: "Hermes Canvas",
  description: "Authenticated workspace for a human and the Hermes agent.",
};

/**
 * Root layout (theming owned by GLASS; frame wiring by PROOF integration).
 *
 * The blocking theme-init script runs before first paint so the persisted
 * light/dark/system preference is applied with no flash of the wrong theme
 * (mirrors `@hermes/ui`'s `applyTheme`). `Providers` mounts the Convex client;
 * `#__hc-root` is the full-height flow root the integration shell sizes against.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const tree = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createThemeInitScript() }} />
      </head>
      <body>
        <Providers>
          <div id="__hc-root">{children}</div>
        </Providers>
      </body>
    </html>
  );

  return authWired ? <ConvexAuthNextjsServerProvider>{tree}</ConvexAuthNextjsServerProvider> : tree;
}
