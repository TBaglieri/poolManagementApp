/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the shared workspace package (TypeScript source) on the fly.
  transpilePackages: ["@poolops/shared", "@poolops/scheduling", "@poolops/supabase"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
