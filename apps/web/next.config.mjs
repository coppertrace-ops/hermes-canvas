/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
