import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    const tags = await prisma.tag.findMany({
      where: search ? {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      } : undefined,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            postTags: true
          }
        }
      }
    });
    
    return NextResponse.json(tags);
  } catch (error) {
    console.error("获取标签失败:", error);
    return NextResponse.json(
      { error: "获取标签失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 创建新标签
export async function POST(request: Request) {
  try {
    // 验证用户权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: "标签名称不能为空" },
        { status: 400 }
      );
    }
    
    // 检查是否已存在同名标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingTag) {
      return NextResponse.json(
        { error: "标签已存在" },
        { status: 409 }
      );
    }
    
    // 创建新标签
    const tag = await prisma.tag.create({
      data: { name: name.trim() }
    });
    
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("创建标签失败:", error);
    return NextResponse.json(
      { error: "创建标签失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 更新标签
export async function PUT(request: Request) {
  try {
    // 验证用户权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    const { id, name } = await request.json();
    
    if (!id || !name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: "ID和名称不能为空" },
        { status: 400 }
      );
    }
    
    // 检查标签是否存在
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });
    
    if (!existingTag) {
      return NextResponse.json(
        { error: "标签不存在" },
        { status: 404 }
      );
    }
    
    // 检查是否已存在同名标签（排除当前标签）
    const duplicateTag = await prisma.tag.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: {
          not: id
        }
      }
    });
    
    if (duplicateTag) {
      return NextResponse.json(
        { error: "标签名已被使用" },
        { status: 409 }
      );
    }
    
    // 更新标签
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: { name: name.trim() }
    });
    
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("更新标签失败:", error);
    return NextResponse.json(
      { error: "更新标签失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 删除标签
export async function DELETE(request: Request) {
  try {
    // 验证用户权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "标签ID不能为空" },
        { status: 400 }
      );
    }
    
    // 检查标签是否存在
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            postTags: true
          }
        }
      }
    });
    
    if (!existingTag) {
      return NextResponse.json(
        { error: "标签不存在" },
        { status: 404 }
      );
    }
    
    // 检查标签是否正在使用中
    if (existingTag._count.postTags > 0) {
      return NextResponse.json(
        { 
          error: "标签正在被使用中，无法删除", 
          count: existingTag._count.postTags 
        },
        { status: 400 }
      );
    }
    
    // 删除标签
    await prisma.tag.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除标签失败:", error);
    return NextResponse.json(
      { error: "删除标签失败，请稍后再试" },
      { status: 500 }
    );
  }
} 