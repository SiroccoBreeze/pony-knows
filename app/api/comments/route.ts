import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

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
    // 验证用户权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // 构建查询条件
    const where: Prisma.CommentWhereInput = {};
    
    if (search) {
      where.OR = [
        { 
          content: { 
            contains: search, 
            mode: 'insensitive' as Prisma.QueryMode 
          } 
        },
        {
          author: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode
            }
          }
        },
        {
          post: {
            title: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode
            }
          }
        }
      ];
    }
    
    // 获取总数
    const total = await prisma.comment.count({ where });
    
    // 获取评论列表
    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          }
        },
        post: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });
    
    return NextResponse.json({
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("获取评论列表失败:", error);
    return NextResponse.json(
      { error: "获取评论列表失败，请稍后再试" },
      { status: 500 }
    );
  }
} 