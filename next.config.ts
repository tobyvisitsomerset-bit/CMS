import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Kentico's section is spelled "buy-someset"; the public URL is the
    // correctly-spelled /buy-somerset, served by the same page.
    return [{ source: "/buy-somerset", destination: "/buy-someset" }];
  },
  async redirects() {
    return [{ source: "/virtual-highstreet", destination: "/buy-somerset", permanent: false }];
  },
};

export default nextConfig;
