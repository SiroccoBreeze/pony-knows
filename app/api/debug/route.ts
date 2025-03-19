import { PrismaClient } from "@prisma/client";
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

export async function GET(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 验证是否管理员
    // 这里简化处理，实际项目中应该有更完善的权限检查
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      );
    }

    // 查询所有帖子
    const posts = await prisma.post.findMany({
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
    });

    // 查询所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    return NextResponse.json({
      totalPosts: posts.length,
      posts,
      totalUsers: users.length,
      users,
      currentSession: session,
    });
  } catch (error) {
    console.error("调试查询失败:", error);
    return NextResponse.json(
      { error: "调试查询失败" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 