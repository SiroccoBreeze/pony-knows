import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// 定义外部链接类型
export type ExternalLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  type: string;
  password: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// 获取所有外部链接
export async function GET() {
  try {
    const session = await getServerSession();
    // 简化的权限检查 - 任何登录用户都被视为普通用户
    const isAdmin = !!session?.user;
    
    // 如果是管理员，返回所有链接；否则只返回激活的链接
    const links = await prisma.externalLink.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: '获取外部链接失败' },
      { status: 500 }
    );
  }
}

// 创建新的外部链接（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    // 简化的权限检查 - 任何登录用户都被视为管理员
    if (!session?.user) {
      return NextResponse.json(
        { error: '无权限执行此操作' },
        { status: 403 }
      );
    }
    
    const data = await req.json();
    
    // 验证必填字段
    if (!data.title || !data.url || !data.type) {
      return NextResponse.json(
        { error: '标题、URL和类型为必填项' },
        { status: 400 }
      );
    }
    
    const newLink = await prisma.externalLink.create({
      data: {
        title: data.title,
        url: data.url,
        description: data.description || null,
        type: data.type,
        password: data.password || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
    
    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: '创建外部链接失败' },
      { status: 500 }
    );
  }
} 