import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// 获取单个帖子
export async function GET(
  request: Request,
  { params }: { params: { id: string | Promise<string> } }
) {
  try {
    // 使用类型断言处理params.id
    const postId = typeof params.id === 'string' ? params.id : await params.id;
    console.log("API 请求帖子ID:", postId);

    // 查找帖子
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    console.log("找到帖子:", post ? "是" : "否");
    
    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 暂时禁用浏览量更新功能，直接返回结果
    return NextResponse.json(post);
  } catch (error) {
    console.error("获取帖子失败:", error);
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    return NextResponse.json(
      { 
        error: "获取帖子失败，请稍后再试", 
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}

// 更新帖子
export async function PUT(
  request: Request,
  { params }: { params: { id: string | Promise<string> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 使用类型断言处理params.id
    const postId = typeof params.id === 'string' ? params.id : await params.id;
    const body = await request.json();
    const { title, content, tags, status } = body;

    // 验证请求数据
    if (!title || !content || !tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "缺少必要的帖子信息" },
        { status: 400 }
      );
    }

    // 检查帖子是否存在且属于当前用户
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "无权修改此帖子" },
        { status: 403 }
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

    // 删除现有标签关联
    await prisma.postToTag.deleteMany({
      where: { postId },
    });

    // 更新帖子
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        status,
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

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("更新帖子失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "更新帖子失败，请稍后再试", details: errorMessage },
      { status: 500 }
    );
  }
}

// 删除帖子
export async function DELETE(
  request: Request,
  { params }: { params: { id: string | Promise<string> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 使用类型断言处理params.id
    const postId = typeof params.id === 'string' ? params.id : await params.id;

    // 检查帖子是否存在且属于当前用户
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "无权删除此帖子" },
        { status: 403 }
      );
    }

    // 删除帖子相关的标签关联
    await prisma.postToTag.deleteMany({
      where: { postId },
    });

    // 删除帖子的评论
    await prisma.comment.deleteMany({
      where: { postId },
    });

    // 删除帖子
    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json(
      { message: "帖子已成功删除" },
      { status: 200 }
    );
  } catch (error) {
    console.error("删除帖子失败:", error);
    return NextResponse.json(
      { error: "删除帖子失败，请稍后再试" },
      { status: 500 }
    );
  }
} 