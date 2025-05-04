import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// 获取单个外部链接
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const session = await getServerSession();
    
    const link = await prisma.externalLink.findUnique({
      where: { id },
    });

    if (!link) {
      return NextResponse.json(
        { error: '链接不存在' },
        { status: 404 }
      );
    }

    // 非管理员只能查看激活的链接
    if (!link.isActive && !session?.user) {
      return NextResponse.json(
        { error: '链接不可用' },
        { status: 403 }
      );
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error('Error fetching link:', error);
    return NextResponse.json(
      { error: '获取链接失败' },
      { status: 500 }
    );
  }
}

// 更新外部链接（仅管理员）
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const session = await getServerSession();
    
    // 简化的权限检查 - 任何登录用户都被视为管理员
    if (!session?.user) {
      return NextResponse.json(
        { error: '无权限执行此操作' },
        { status: 403 }
      );
    }

    const data = await req.json();
    
    // 先检查链接是否存在
    const existingLink = await prisma.externalLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: '链接不存在' },
        { status: 404 }
      );
    }

    // 更新链接
    const updatedLink = await prisma.externalLink.update({
      where: { id },
      data: {
        title: data.title ?? existingLink.title,
        url: data.url ?? existingLink.url,
        description: data.description,
        type: data.type ?? existingLink.type,
        password: data.password,
        isActive: data.isActive !== undefined ? data.isActive : existingLink.isActive,
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: '更新链接失败' },
      { status: 500 }
    );
  }
}

// 删除外部链接（仅管理员）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const session = await getServerSession();
    
    // 简化的权限检查 - 任何登录用户都被视为管理员
    if (!session?.user) {
      return NextResponse.json(
        { error: '无权限执行此操作' },
        { status: 403 }
      );
    }

    // 先检查链接是否存在
    const existingLink = await prisma.externalLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: '链接不存在' },
        { status: 404 }
      );
    }

    // 删除链接
    await prisma.externalLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: '删除链接失败' },
      { status: 500 }
    );
  }
} 