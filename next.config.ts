import type { NextConfig } from "next";

// Content-Security-Policy tuned to what the storefront actually needs:
// same-origin everything, inline styles/scripts (Next runtime + JSON-LD, no
// external JS is ever loaded), and images from self/data/blob/https (product
// photos are proxied to same-origin, OG/icons are same-origin).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework/version.
  poweredByHeader: false,
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
