import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || 'https://api-server.doctorphc.id';

export default {
  async rewrites() {
    return [
      { source: '/api/proxy/:path*', destination: `${apiOrigin}/api/:path*` },
    ];
  },
};
