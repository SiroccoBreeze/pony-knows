import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// 获取帖子的评论列表
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const postId = id;
    
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalCommentCount = await prisma.comment.count({
      where: { postId }
    });

    return NextResponse.json({
      comments,
      totalCount: totalCommentCount
    });
  } catch (error) {
    console.error("获取评论失败:", error);
    return NextResponse.json(
      { error: "获取评论失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 创建新评论
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const postId = id;
    
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "无效的请求数据" },
        { status: 400 }
      );
    }

    const { content, parentId, replyToUserId, replyToUserName } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: "评论内容不能为空" },
        { status: 400 }
      );
    }

    // 验证帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, authorId: true }
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 如果 parentId 存在，验证父评论是否存在且属于同一帖子
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { postId: true, authorId: true }
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "父评论不存在" },
          { status: 404 }
        );
      }

      if (parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "父评论不属于当前帖子" },
          { status: 400 }
        );
      }
    }

    // 创建评论，包含回复信息
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId,
        parentId: parentId || null,
        // 添加自定义字段来存储被回复用户信息
        // 注意：必须是 Prisma 模型中定义的字段才能保存
        // 如果数据库模型中没有这些字段，需要先进行迁移
        ...(replyToUserId && { replyToUserId }),
        ...(replyToUserName && { replyToUserName }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 确定通知接收者（根据评论类型）
    let recipientUserId;

    if (replyToUserId) {
      // 如果是回复别人的评论，则通知被回复者
      recipientUserId = replyToUserId;
    } else if (parentId) {
      // 如果回复某条评论但没有指定replyToUserId，则获取父评论作者
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true }
      });
      recipientUserId = parentComment?.authorId;
    } else {
      // 如果是直接评论帖子，则通知帖子作者
      recipientUserId = post.authorId;
    }

    // 发送通知（如果接收者不是自己）
    if (recipientUserId && recipientUserId !== session.user.id) {
      try {
        // 使用服务器内部直接调用函数的方式，而不是通过axios发送HTTP请求
        const { headers } = request;
        const protocol = headers.get("x-forwarded-proto") || "http";
        const host = headers.get("host") || "localhost:3000";
        const baseUrl = `${protocol}://${host}`;

        // 发送通知请求
        await fetch(`${baseUrl}/api/comments/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 传递认证信息
            'Cookie': headers.get('cookie') || ''
          },
          body: JSON.stringify({
            commentId: comment.id,
            postId: post.id,
            postTitle: post.title,
            commentContent: content,
            recipientUserId: recipientUserId
          })
        });
      } catch (notifyError) {
        console.error("发送评论通知失败:", notifyError);
        // 通知失败不影响评论创建成功
      }
    }

    // 在返回的评论对象中添加被回复用户信息
    return NextResponse.json({
      ...comment,
      ...(replyToUserId && { replyToUserId }),
      ...(replyToUserName && { replyToUserName }),
    }, { status: 201 });
  } catch (error) {
    console.error("创建评论失败:", error);
    return NextResponse.json(
      { error: "创建评论失败，请稍后再试" },
      { status: 500 }
    );
  }
} 