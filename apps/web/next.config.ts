import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Dev-only concern: video uploads (≤500MB) go through the /api rewrite proxy,
  // which buffers bodies and defaults to 10MB. In prod Caddy bypasses Next.
  experimental: { middlewareClientMaxBodySize: "550mb" },
  async rewrites() {
    // Evaluated at build time — the Docker build bakes this to http://api:8000.
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default config;
