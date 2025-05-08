/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    // Next.js 15已移除middleware配置项
  },
}

module.exports = nextConfig 