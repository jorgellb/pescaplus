import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so the extra lockfile in the parent
  // directory doesn't confuse Turbopack's root inference during build.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
