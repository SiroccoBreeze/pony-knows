import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prisma";
import { getSystemParameterWithDefaultFromDb } from "@/lib/system-parameters";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: {
      role: {
        name: string;
        permissions: string[];
      }
    }[];
  };
}

// 处理评论相关的API
export async function POST(req: NextRequest) {
  try {
    // 验证用户是否已登录
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    // 检查评论功能是否已启用
    const commentsEnabled = await getSystemParameterWithDefaultFromDb("enable_comments", "true");
    
    // 如果评论功能已关闭，检查用户是否是管理员
    if (commentsEnabled === "false") {
      const isAdmin = session.user.roles?.some(role => 
        role.role.permissions.includes("admin_access")
      ) || false;
      
      // 只有管理员可以在评论功能关闭时发表评论
      if (!isAdmin) {
        return NextResponse.json(
          { error: "评论功能已关闭" },
          { status: 403 }
        );
      }
    }
    
    // 解析请求数据
    const body = await req.json();
    const { postId, content, parentId, replyToUserId, replyToUserName } = body;
    
    // 验证必填参数
    if (!postId || !content) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    // 验证帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }
    
    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId,
        parentId: parentId || null,
        replyToUserId: replyToUserId || null,
        replyToUserName: replyToUserName || null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        parent: parentId ? {
          select: {
            id: true,
            content: true
          }
        } : false
      }
    });
    
    // 如果是回复评论，创建通知
    if (replyToUserId && replyToUserId !== session.user.id) {
      await prisma.message.create({
        data: {
          title: "有新回复",
          content: `${session.user.name || "某用户"} 回复了您的评论: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
          type: "reply",
          userId: replyToUserId,
          postId: postId,
          sender: session.user.name || "系统通知"
        }
      });
    }
    // 如果是帖子评论且不是自己的帖子，通知帖子作者
    else if (post.authorId !== session.user.id) {
      await prisma.message.create({
        data: {
          title: "新评论通知",
          content: `${session.user.name || "某用户"} 评论了您的帖子: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
          type: "comment",
          userId: post.authorId,
          postId: postId,
          sender: session.user.name || "系统通知"
        }
      });
    }
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error("创建评论失败:", error);
    return NextResponse.json(
      { error: "创建评论失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 获取评论列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null // 只获取顶级评论
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error("获取评论失败:", error);
    return NextResponse.json(
      { error: "获取评论失败，请稍后再试" },
      { status: 500 }
    );
  }
} 