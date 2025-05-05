import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { AdminPermission } from '@/lib/permissions';

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
    if (!session?.user) {
      return NextResponse.json(
        { error: '需要登录才能访问' },
        { status: 401 }
      );
    }
    
    // 简化的权限检查 - 查询用户角色和权限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 收集用户的所有权限
    const permissions: string[] = [];
    for (const userRole of user.userRoles) {
      permissions.push(...(userRole.role.permissions || []));
    }
    
    const isAdmin = permissions.includes(AdminPermission.ADMIN_ACCESS);
    
    // 如果是管理员，返回所有链接；否则只返回激活的链接
    const links = await prisma.link.findMany({
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
    if (!session?.user) {
      return NextResponse.json(
        { error: '需要登录才能访问' },
        { status: 401 }
      );
    }
    
    // 简化的权限检查 - 查询用户角色和权限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 收集用户的所有权限
    const permissions: string[] = [];
    for (const userRole of user.userRoles) {
      permissions.push(...(userRole.role.permissions || []));
    }
    
    const isAdmin = permissions.includes(AdminPermission.ADMIN_ACCESS);
    
    // 验证管理员权限
    if (!isAdmin) {
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
    
    const newLink = await prisma.link.create({
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