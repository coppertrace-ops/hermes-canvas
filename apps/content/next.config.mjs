/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static export: no server code, no API routes, no dynamic rendering on
  // this origin — just the shell shell + its client runtime as static files. The
  // CSP + nosniff headers are applied by Vercel from `vercel.json` (static export
  // ignores `headers()`), generated from @hermes/policy (see `gen-headers.ts`).
  output: "export",
  reactStrictMode: true,
  // The shell runtime consumes the frame protocol verbatim from @hermes/policy.
  transpilePackages: ["@hermes/policy"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
