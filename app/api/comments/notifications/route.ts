import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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

// 创建评论通知（当有新评论时调用）
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
    const { 
      commentId,
      postId, 
      postTitle,
      commentContent, 
      recipientUserId 
    } = body;

    // 验证请求数据
    if (!commentId || !postId || !postTitle || !commentContent || !recipientUserId) {
      return NextResponse.json(
        { error: "缺少必要的参数" },
        { status: 400 }
      );
    }

    // 确保不会给自己发送评论通知
    if (recipientUserId === session.user.id) {
      return NextResponse.json({ 
        success: true, 
        message: "跳过发送给自己的通知" 
      });
    }

    // 获取评论用户名
    const commenterName = session.user.name || "用户";

    // 创建消息通知
    const message = await prisma.message.create({
      data: {
        title: `《${postTitle}》有新回复`,
        content: `用户 ${commenterName} 回复了您：${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}`,
        type: "reply",
        userId: recipientUserId,
        postId: postId,
        sender: commenterName,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "评论通知已创建",
      notificationId: message.id
    });
  } catch (error) {
    console.error("创建评论通知失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "创建评论通知失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 系统公告（管理员使用）
export async function PUT(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 验证管理员权限（这里简单示例，实际应用中需要检查用户角色）
    const isAdmin = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        email: {
          endsWith: "@admin.com" // 示例，实际应用应使用角色系统
        }
      }
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: "没有权限执行此操作" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, targetUserIds } = body;

    // 验证请求数据
    if (!title || !content) {
      return NextResponse.json(
        { error: "标题和内容不能为空" },
        { status: 400 }
      );
    }

    // 创建系统通知
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // 发送给特定用户
      await Promise.all(
        targetUserIds.map(userId =>
          prisma.message.create({
            data: {
              title,
              content,
              type: "system",
              userId,
            }
          })
        )
      );
    } else {
      // 发送给所有用户
      const allUsers = await prisma.user.findMany({
        select: { id: true }
      });

      await Promise.all(
        allUsers.map(user =>
          prisma.message.create({
            data: {
              title,
              content,
              type: "system",
              userId: user.id,
            }
          })
        )
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "系统通知已发送" 
    });
  } catch (error) {
    console.error("发送系统通知失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "发送系统通知失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 