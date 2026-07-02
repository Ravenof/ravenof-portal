import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Reduce JS bundle by tree-shaking icon libraries
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Serve modern formats (avif/webp) automatically
    formats: ['image/avif', 'image/webp'],
    // Cache card images for 1 hour on CDN
    minimumCacheTTL: 3600,
  },
}

export default nextConfig
