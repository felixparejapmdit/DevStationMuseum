import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The 3D bundle is client-only and lazy-loaded; keep three tree-shakeable.
  experimental: { optimizePackageImports: ['@react-three/drei', 'lucide-react'] },
}

export default nextConfig
