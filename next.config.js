/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    // 确保中间件不使用错误的运行时
    middleware: {
      // skipMiddlewareUrlNormalize: true,
      // skipTrailingSlashRedirect: true,
      // 确保在Edge运行时中运行
      // workerThreads: false,
      // fallbackNodeJs: false,
    },
  },
}

module.exports = nextConfig 