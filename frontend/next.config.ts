import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No 'output' config - using Server mode for dynamic routes
  trailingSlash: false,  // No trailing slashes in URLs

  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,

  // Webpack memory optimization (Next.js 15+)
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
