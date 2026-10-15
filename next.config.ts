import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Course uploads are capped at 10 MB in src/lib/files.ts; leave headroom for the other form fields.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
