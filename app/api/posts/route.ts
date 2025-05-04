import { PrismaClient, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { AdminPermission } from "@/lib/permissions";

const prisma = new PrismaClient();

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

    // 获取请求头信息，判断是否管理员操作
    const adminOverride = request.headers.get("X-Admin-Override") === "true";

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

    // 如果是管理员或草稿状态，直接设置为已审核
    // 如果是普通用户发布文章，设置为待审核
    const reviewStatus = (status === 'draft' || adminOverride) ? 'approved' : 'pending';

    // 创建帖子
    const post = await prisma.post.create({
      data: {
        title,
        content,
        status,
        reviewStatus, // 添加审核状态
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

    // 如果帖子需要审核，返回相应提示
    if (reviewStatus === 'pending') {
      return NextResponse.json(
        { 
          ...post, 
          message: "帖子已提交，等待管理员审核后将在论坛显示" 
        }, 
        { status: 201 }
      );
    }

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
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const reviewStatus = searchParams.get('reviewStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skipPagination = searchParams.get('skipPagination') === 'true';

    console.log("API查询参数:", { status, authorId, search, tags, reviewStatus, page, limit, skipPagination });
    
    // 构建查询条件
    const where: Prisma.PostWhereInput = {};
    
    // 如果提供了作者ID，则按作者筛选
    if (authorId) {
      where.authorId = authorId;
    }
    
    if (status) {
      where.status = status;
    } else {
      // 默认情况下，如果没有明确请求草稿状态的帖子且不是作者本人请求，则排除草稿帖子
      const session = await getServerSession(authOptions) as ExtendedSession;
      const currentUserId = session?.user?.id;
      
      // 如果不是作者本人查看，排除草稿帖子
      if (!currentUserId || (authorId && authorId !== currentUserId)) {
        where.status = 'published';
      }
    }

    // 处理审核状态查询
    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    } else {
      // 默认只显示已审核通过的帖子（对于公开显示的帖子）
      const session = await getServerSession(authOptions) as ExtendedSession;
      
      // 检查请求头中是否有管理员标识
      const isAdminRequest = request.headers.get("X-Admin-Request") === "true";
      
      // 获取用户权限
      const userPermissions: string[] = [];
      let isSuperAdmin = false;
      
      if (session?.user?.roles) {
        session.user.roles.forEach(role => {
          if (role.role.permissions) {
            userPermissions.push(...role.role.permissions);
          }
          if (role.role.name === "超级管理员") {
            isSuperAdmin = true;
          }
        });
      }
      
      const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
      const canViewAllPosts = userPermissions.includes(AdminPermission.VIEW_POSTS);
      
      // 如果不是管理员请求/管理员权限/作者本人查看，只显示已审核通过的帖子
      if (!isAdminRequest && !isSuperAdmin && !isAdmin && !canViewAllPosts && 
          (!session?.user?.id || (authorId && authorId !== session.user.id))) {
        where.reviewStatus = 'approved';
      }
    }
    
    // 如果提供了搜索关键词，则进行标题和内容的模糊搜索
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // 如果提供了标签，则按标签筛选
    if (tags) {
      const tagNames = tags.split(',');
      where.postTags = {
        some: {
          tag: {
            name: {
              in: tagNames,
            },
          },
        },
      };
    }
    
    // 计算总数
    const total = await prisma.post.count({ where });
    
    // 查询帖子列表
    const postsQuery = prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        postTags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // 如果不需要分页则直接返回所有结果
    const posts = skipPagination
      ? await postsQuery
      : await prisma.post.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            postTags: {
              include: {
                tag: true,
              },
            },
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });
    
    return NextResponse.json({
      posts,
      total,
      page: skipPagination ? 1 : page,
      limit: skipPagination ? total : limit,
      totalPages: skipPagination ? 1 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("获取帖子列表失败:", error);
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "获取帖子列表失败，请稍后再试", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 