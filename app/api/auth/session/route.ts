import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
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

export async function POST(request: Request) {
  return handleSessionRequest(request);
}

export async function PATCH(request: Request) {
  return handleSessionRequest(request);
}

// 通用的会话处理函数
async function handleSessionRequest(request: Request) {
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
        bio: true,
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
      bio: user.bio,
      roles: user.userRoles.map(ur => ({
        role: {
          name: ur.role.name,
          permissions: ur.role.permissions
        }
      }))
    };
    
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('处理会话请求失败:', error);
    return NextResponse.json(
      { error: '处理会话请求失败' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 