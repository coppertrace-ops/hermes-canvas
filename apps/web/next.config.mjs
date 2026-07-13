/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace TS packages are consumed from source; Next transpiles them
  // (and resolves their internal `.js` specifiers to `.ts`).
  transpilePackages: ["@hermes/env"],
  // Linting and type-checking run as their own turbo tasks, not inside `next build`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
