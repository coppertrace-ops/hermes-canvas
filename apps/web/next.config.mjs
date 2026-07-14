import { appCspHostsFromEnv, buildAppCsp } from "./appCsp.mjs";

// App-origin CSP (spec §2.3). This is a SECURITY FLOOR, not a feature flag — it
// ships on every response so the Markdown image-beacon channel is closed app-wide,
// the sandbox mount is authorized to exactly the content host, and the Convex
// WebSocket stays reachable. Dev adds only HMR allowances ('unsafe-eval' + local
// ws), never shipped to production.
const isDev = process.env.NODE_ENV !== "production";
const APP_CSP = buildAppCsp(appCspHostsFromEnv(process.env), { dev: isDev });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: APP_CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  // Workspace TS packages are consumed from source; Next transpiles them
  // (and resolves their internal `.js` specifiers to `.ts`). PROOF integration
  // mounts the UI/render/chat/history surfaces, which pull in the rest of the
  // design-system and renderer packages, so all of them must be transpiled here.
  transpilePackages: [
    "@hermes/env",
    "@hermes/ui",
    "@hermes/render",
    "@hermes/diff",
    "@hermes/contract",
    "@hermes/policy",
  ],
  // Linting and type-checking run as their own turbo tasks, not inside `next build`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
