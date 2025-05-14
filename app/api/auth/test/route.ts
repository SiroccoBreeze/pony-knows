import { NextResponse } from 'next/server';

export async function GET() {
  // 显示重要的环境变量配置
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    nextauthUrl: process.env.NEXTAUTH_URL,
    nextauthSecret: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
    baseUrl: process.env.BASE_URL || '未设置',
    apiBaseUrl: process.env.API_BASE_URL || '未设置',
  };
  
  return NextResponse.json({
    status: 'ok',
    message: '这是NextAuth配置测试API',
    envInfo
  });
} 