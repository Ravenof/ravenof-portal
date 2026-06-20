import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Build neblokuojamas dėl ESLint (projekte 100+ senų lint pastabų; tipų saugą tikrina tsc).
  // Lint paleidžiamas rankiniu būdu: npm run lint
  eslint: { ignoreDuringBuilds: true },
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
