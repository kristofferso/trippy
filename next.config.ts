import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    cacheComponents: true,
    clientSegmentCache: true
  }
};

export default nextConfig;
