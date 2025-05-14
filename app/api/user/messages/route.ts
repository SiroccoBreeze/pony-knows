import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
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

// 消息响应接口
interface MessageResponse extends Prisma.MessageGetPayload<{
  include: { post: { select: { id: true; title: true } } }
}> {
  time: string;
  link?: string;
}

// 获取消息列表
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'reply', 'system' 或 不传表示全部
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const where: Prisma.MessageWhereInput = {
      userId: session.user.id,
    };

    // 如果指定了消息类型，添加到查询条件
    if (type) {
      where.type = type;
    }

    // 计算总数
    const total = await prisma.message.count({ where });

    // 获取消息列表
    const messages = await prisma.message.findMany({
      where,
      include: {
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
      take: limit,
    });

    // 转换消息数据，添加链接字段
    const formattedMessages: MessageResponse[] = messages.map(message => {
      const result = {
        ...message,
        link: message.postId ? `/forum/post/${message.postId}` : undefined,
        time: '' // 初始化时间字段
      };
      
      // 计算人性化时间
      const createdAt = new Date(message.createdAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
      
      if (diff < 60) {
        result.time = `${diff}秒前`;
      } else if (diff < 3600) {
        result.time = `${Math.floor(diff / 60)}分钟前`;
      } else if (diff < 86400) {
        result.time = `${Math.floor(diff / 3600)}小时前`;
      } else if (diff < 2592000) {
        result.time = `${Math.floor(diff / 86400)}天前`;
      } else {
        result.time = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}-${createdAt.getDate().toString().padStart(2, '0')}`;
      }
      
      return result;
    });

    // 计算未读消息数
    const unreadCount = await prisma.message.count({
      where: {
        userId: session.user.id,
        read: false
      }
    });

    // 计算未读回复消息数
    const unreadReplyCount = await prisma.message.count({
      where: {
        userId: session.user.id,
        type: "reply",
        read: false
      }
    });

    // 计算未读系统消息数
    const unreadSystemCount = await prisma.message.count({
      where: {
        userId: session.user.id,
        type: "system",
        read: false
      }
    });

    return NextResponse.json({
      messages: formattedMessages,
      unreadCount,
      unreadReplyCount,
      unreadSystemCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("获取消息列表失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "获取消息列表失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 标记消息为已读
export async function PATCH(request: Request) {
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
    const { messageId, readAll } = body;

    if (readAll) {
      // 标记所有消息为已读
      await prisma.message.updateMany({
        where: {
          userId: session.user.id,
          read: false
        },
        data: {
          read: true
        }
      });

      return NextResponse.json({ success: true, message: "所有消息已标记为已读" });
    } else if (messageId) {
      // 标记单个消息为已读
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          userId: session.user.id
        }
      });

      if (!message) {
        return NextResponse.json(
          { error: "消息不存在或无权限操作" },
          { status: 404 }
        );
      }

      await prisma.message.update({
        where: {
          id: messageId
        },
        data: {
          read: true
        }
      });

      return NextResponse.json({ success: true, message: "消息已标记为已读" });
    } else {
      return NextResponse.json(
        { error: "请提供消息ID或指定标记所有消息" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("标记消息失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "标记消息失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 创建消息
export async function POST(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    // 检查是否是管理员操作
    const isAdminRequest = request.headers.get("X-Admin-Request") === "true";
    
    if (!session?.user?.id && !isAdminRequest) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { userId, type, title, content, postId, sender } = body;
    
    if (!userId || !type || !title || !content) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    // 创建消息
    const message = await prisma.message.create({
      data: {
        userId,
        type,
        title,
        content,
        postId,
        sender: sender || (session?.user?.name || "系统"),
        read: false,
      }
    });
    
    // 更新本地存储以触发客户端更新
    const timestamp = new Date().getTime().toString();
    
    return NextResponse.json({
      success: true,
      message: "消息已创建",
      data: message,
      timestamp
    }, { status: 201 });
  } catch (error) {
    console.error("创建消息失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "创建消息失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 删除消息
export async function DELETE(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: "请提供消息ID" },
        { status: 400 }
      );
    }

    // 检查消息是否存在且属于当前用户
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        userId: session.user.id
      }
    });

    if (!message) {
      return NextResponse.json(
        { error: "消息不存在或无权限操作" },
        { status: 404 }
      );
    }

    // 删除消息
    await prisma.message.delete({
      where: {
        id: messageId
      }
    });

    return NextResponse.json({ success: true, message: "消息已删除" });
  } catch (error) {
    console.error("删除消息失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "删除消息失败", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 