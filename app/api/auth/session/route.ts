import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ user: null });
    }
    
    // 获取最新的用户数据
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        // @ts-ignore - 我们已经添加了bio字段，但TypeScript定义尚未更新
        bio: true,  // 添加bio字段
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ user: null });
    }
    
    // 构建返回的用户对象
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      // @ts-ignore - 添加bio字段，即使TypeScript定义尚未更新
      bio: user.bio,  // 添加bio字段
      roles: user.userRoles.map(ur => ({
        role: {
          name: ur.role.name,
          permissions: ur.role.permissions
        }
      }))
    };
    
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('获取会话信息失败:', error);
    return NextResponse.json(
      { error: '获取会话信息失败' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 