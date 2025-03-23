import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // 启用增强的API路由支持
    serverComponentsExternalPackages: ['@prisma/client'],
    // 其他可能有助于解决问题的设置
    serverActions: true,
  }
};

export default nextConfig;
