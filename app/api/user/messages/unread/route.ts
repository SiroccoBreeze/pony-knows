import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

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

export async function GET() {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 获取未读消息数量 - 确保计数准确
    const unreadCount = await prisma.message.count({
      where: {
        userId: session.user.id,
        read: false
      }
    });

    // 如果没有未读消息，直接返回
    if (unreadCount === 0) {
      return NextResponse.json({
        unreadCount: 0,
        recentMessages: []
      });
    }

    // 获取3条最新的未读消息
    const recentUnreadMessages = await prisma.message.findMany({
      where: {
        userId: session.user.id,
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3,
      include: {
        post: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // 格式化消息数据
    const recentMessages = recentUnreadMessages.map(message => {
      // 计算人性化时间
      const createdAt = new Date(message.createdAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
      
      let timeText = '';
      if (diff < 60) {
        timeText = `${diff}秒前`;
      } else if (diff < 3600) {
        timeText = `${Math.floor(diff / 60)}分钟前`;
      } else if (diff < 86400) {
        timeText = `${Math.floor(diff / 3600)}小时前`;
      } else if (diff < 2592000) {
        timeText = `${Math.floor(diff / 86400)}天前`;
      } else {
        timeText = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}-${createdAt.getDate().toString().padStart(2, '0')}`;
      }

      // 格式化标题
      let title = '';
      if (message.type === 'reply') {
        title = `有新回复: 《${message.post?.title || '帖子'}》`;
      } else if (message.type === 'system') {
        title = `系统通知: ${message.title}`;
      } else {
        title = message.title;
      }

      return {
        id: message.id,
        title,
        content: message.content,
        time: timeText,
        link: message.postId ? `/forum/post/${message.postId}` : undefined
      };
    });

    return NextResponse.json({
      unreadCount,
      recentMessages
    });
  } catch (error) {
    console.error("获取未读消息数据失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "获取未读消息数据失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 