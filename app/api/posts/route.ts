import { PrismaClient, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
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

    // 处理帖子内容中的图片和文件链接
    // 不论帖子状态（草稿或发布），都处理文件关联和迁移
    console.log(`处理帖子ID ${post.id} 的媒体文件，帖子状态: ${status}`);
    
    // 处理图片链接 - 匹配 Markdown 图片语法 ![alt](url)
    const imageLinksRegex = /!\[(.*?)\]\(([^)]+)\)/g;
    const imageUrls: string[] = [];
    let imageMatch;
    
    while ((imageMatch = imageLinksRegex.exec(content)) !== null) {
      const url = imageMatch[2];
      if (url && url.includes('/api/files/')) {
        imageUrls.push(url);
        console.log('检测到图片链接:', url);
      }
    }
    
    // 处理文件链接 - 匹配 Markdown 链接语法 [text](url)，但排除已匹配的图片
    const fileLinksRegex = /\[(.*?)\]\(([^)]+)\)/g;
    const fileUrls: string[] = [];
    let fileMatch;
    
    while ((fileMatch = fileLinksRegex.exec(content)) !== null) {
      const linkText = fileMatch[1];
      const url = fileMatch[2];
      
      // 检查是否是 API 文件链接，并且不是图片链接
      if (url && url.includes('/api/files/') && !content.includes(`![${linkText}](${url})`)) {
        fileUrls.push(url);
        console.log('检测到文件链接:', url);
      }
    }
    
    // 处理所有检测到的媒体文件链接
    const allUrls = [...imageUrls, ...fileUrls];
    
    if (allUrls.length > 0) {
      const userId = session.user.id;
      console.log(`检测到 ${allUrls.length} 个媒体文件链接，开始处理...`);
      
      for (const fileUrl of allUrls) {
        try {
          // 解析 URL
          const urlObj = new URL(fileUrl, request.headers.get('origin') || 'http://localhost');
          const urlPath = urlObj.pathname;
          const pathParts = urlPath.split('/').filter(Boolean);
          
          // 检查 URL 格式是否正确 /api/files/:userId/:category/:filename
          if (pathParts.length < 4 || pathParts[0] !== 'api' || pathParts[1] !== 'files') {
            console.log(`URL 格式不正确，跳过: ${fileUrl}`);
            continue;
          }
          
          const urlUserId = pathParts[2];
          const category = pathParts[3];
          const filename = pathParts[4];
          
          if (urlUserId !== userId) {
            console.log(`文件不属于当前用户，跳过: ${fileUrl}`);
            continue;
          }
          
          // 构造临时路径和正式路径
          const tempPath = `users/${userId}/temp/${category}s/${filename}`;
          const formalPath = `users/${userId}/posts/${category}s/${filename}`;
          
          // 推断文件类型
          let fileType = category === 'image' ? 'image/jpeg' : 'application/octet-stream';
          const fileExt = filename.split('.').pop()?.toLowerCase() || '';
          
          if (fileExt === 'png') fileType = 'image/png';
          else if (fileExt === 'gif') fileType = 'image/gif';
          else if (fileExt === 'pdf') fileType = 'application/pdf';
          else if (['doc', 'docx'].includes(fileExt)) fileType = 'application/msword';
          else if (['xls', 'xlsx'].includes(fileExt)) fileType = 'application/vnd.ms-excel';
          else if (['zip', 'rar'].includes(fileExt)) fileType = 'application/zip';
          
          // 检查 MinIO 中的文件并迁移
          try {
            const { minioService } = await import('@/lib/minio');
            
            // 尝试从临时目录获取文件
            let fileContent: Buffer;
            try {
              fileContent = await minioService.downloadFile(tempPath);
              console.log(`找到临时文件: ${tempPath}`);
              
              // 迁移到正式目录
              await minioService.uploadBuffer(fileContent, formalPath, fileType);
              console.log(`成功上传到正式目录: ${formalPath}`);
              
              // 删除临时文件
              await minioService.delete(tempPath);
              console.log(`删除临时文件: ${tempPath}`);
              
              // 创建文件关联记录
              await prisma.postImage.create({
                data: {
                  postId: post.id,
                  url: fileUrl,
                  filename: formalPath,
                  type: fileType,
                  size: fileContent.length
                }
              });
              
              console.log(`成功关联文件到帖子: 帖子ID=${post.id}, 文件路径=${formalPath}`);
            } catch (tempError) {
              console.log(`临时文件访问失败: ${tempError instanceof Error ? tempError.message : String(tempError)}`);
              
              // 检查文件是否已在正式目录
              try {
                fileContent = await minioService.downloadFile(formalPath);
                console.log(`文件已在正式目录: ${formalPath}`);
                
                // 直接关联现有文件
                await prisma.postImage.create({
                  data: {
                    postId: post.id,
                    url: fileUrl,
                    filename: formalPath,
                    type: fileType,
                    size: fileContent.length
                  }
                });
                
                console.log(`关联已存在的文件: 帖子ID=${post.id}, 文件路径=${formalPath}`);
              } catch (error) {
                // 忽略错误，只记录日志
                console.error(`文件在临时和正式目录都不存在: ${fileUrl}`);
              }
            }
          } catch (error) {
            console.error(`处理文件失败: ${fileUrl}`, error);
          }
        } catch (error) {
          console.error(`解析文件URL失败: ${fileUrl}`, error);
        }
      }
    }

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
      const canViewAllPosts = isAdmin; // 简化检查，admin可以查看所有帖子
      
      // 如果不是管理员请求/管理员权限/作者本人查看，只显示已审核通过的帖子
      if (!isAdminRequest && !isSuperAdmin && !isAdmin && 
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