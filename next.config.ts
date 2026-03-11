import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Allow data URLs for uploaded logos
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
