import { PrismaClient, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function POST(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, tags, status } = body;

    // 验证请求数据
    if (!title || !content || !tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "缺少必要的帖子信息" },
        { status: 400 }
      );
    }

    // 创建或获取标签
    const tagPromises = tags.map(async (tagName: string) => {
      const existingTag = await prisma.tag.findUnique({
        where: { name: tagName },
      });
      if (existingTag) {
        return existingTag;
      }
      return prisma.tag.create({
        data: { name: tagName },
      });
    });

    const resolvedTags = await Promise.all(tagPromises);

    // 创建帖子
    const post = await prisma.post.create({
      data: {
        title,
        content,
        status,
        authorId: session.user.id,
        postTags: {
          create: resolvedTags.map(tag => ({
            tagId: tag.id
          }))
        }
      },
      include: {
        postTags: {
          include: {
            tag: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("创建帖子失败:", error);
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "创建帖子失败，请稍后再试", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');

    console.log("API查询参数:", { status, authorId });
    
    // 检查authorId参数格式
    if (authorId) {
      console.log(`authorId类型: ${typeof authorId}, 长度: ${authorId.length}, 值: ${authorId}`);
    }

    // 构建查询条件
    const where: Prisma.PostWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (authorId) {
      where.authorId = authorId;
      
      // 查看数据库中是否有这个ID的用户
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, email: true }
      });
      console.log("用户查询结果:", user);
      
      // 直接检查数据库中的帖子作者ID（不依赖前端传入的authorId）
      const postAuthors = await prisma.post.findMany({
        select: { id: true, title: true, authorId: true },
        take: 5 // 只获取前5条记录用于调试
      });
      console.log("帖子作者ID示例:", postAuthors);
    }

    // 获取帖子列表
    const posts = await prisma.post.findMany({
      where,
      include: {
        postTags: {
          include: {
            tag: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`查询到 ${posts.length} 条帖子记录`);
    
    // 如果没有帖子但有authorId，尝试检查用户是否存在
    if (posts.length === 0 && authorId) {
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true, name: true }
      });
      console.log("用户查询结果:", user);
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error("获取帖子列表失败:", error);
    return NextResponse.json(
      { error: "获取帖子列表失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 