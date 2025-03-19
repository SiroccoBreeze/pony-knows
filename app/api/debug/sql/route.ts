import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

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

    // 执行原始SQL查询
    const postResults = await prisma.$queryRaw`
      SELECT 
        p.id, 
        p.title, 
        p.author_id as "authorId", 
        u.name as "userName", 
        u.email as "userEmail"
      FROM "Post" p
      JOIN "User" u ON p.author_id = u.id
      LIMIT 10
    `;
    
    // 查询用户表
    const userResults = await prisma.$queryRaw`
      SELECT id, name, email FROM "User" LIMIT 10
    `;
    
    // 查询当前用户信息
    const currentUserResult = await prisma.$queryRaw`
      SELECT id, name, email FROM "User" WHERE id = ${session.user.id}
    `;

    return NextResponse.json({
      posts: postResults,
      users: userResults,
      currentUser: currentUserResult,
      session: session
    });
  } catch (error) {
    console.error("SQL查询失败:", error);
    return NextResponse.json(
      { error: "SQL查询失败", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 