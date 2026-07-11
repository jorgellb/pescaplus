import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so the extra lockfile in the parent
  // directory doesn't confuse Turbopack's root inference during build.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Optimize product images from the AliExpress CDNs (and legacy Unsplash).
    remotePatterns: [
      { protocol: "https", hostname: "*.aliexpress-media.com" },
      { protocol: "https", hostname: "**.alicdn.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
