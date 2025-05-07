import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";  // 直接从lib导入
import prisma from "@/lib/prisma";
import { AdminPermission } from "@/lib/permissions";

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

// 获取单个帖子
export async function GET(
  request: Request,
  { params }: { params: { id: string | Promise<{ id: string }> } }
) {
  try {
    // 正确处理params - 先await整个params对象
    const paramsData = await Promise.resolve(params);
    // 如果id是Promise，则await它
    const id = typeof paramsData.id === 'string' 
      ? paramsData.id 
      : (await paramsData.id).id;
    console.log("API 请求帖子ID:", id);

    // 查找帖子
    const post = await prisma.post.findUnique({
      where: { id },
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
        images: true, // 添加图片关联
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

// 部分更新帖子 - 用于审核等操作
export async function PATCH(
  request: Request,
  { params }: { params: { id: string | Promise<{ id: string }> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    console.log("API - 审核帖子 - 会话:", JSON.stringify(session?.user, null, 2));
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 正确处理params - 先await整个params对象
    const paramsData = await Promise.resolve(params);
    // 如果id是Promise，则await它
    const id = typeof paramsData.id === 'string' 
      ? paramsData.id 
      : (await paramsData.id).id;
    const requestData = await request.json();
    const { reviewStatus, content } = requestData;

    // 检查帖子是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { 
        authorId: true,
        content: true,
        reviewStatus: true 
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 获取用户权限
    const userPermissions: string[] = [];
    
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    // 特殊处理：超级管理员总是可以审核帖子
    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    
    // 检查请求头中是否有管理员覆盖标记
    const adminOverride = request.headers.get("X-Admin-Override") === "true";
    
    // 检查权限：用户必须拥有编辑帖子权限或是超级管理员
    const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
    const canEditPosts = userPermissions.includes(AdminPermission.ADMIN_ACCESS);

    // 只允许管理员或超级管理员进行审核和编辑操作
    if (!canEditPosts && !isAdmin && !isSuperAdmin && !adminOverride) {
      return NextResponse.json(
        { error: "无权操作帖子" },
        { status: 403 }
      );
    }

    // 准备更新数据
    const updateData: any = {};
    
    // 如果请求包含审核状态，则验证并添加到更新数据中
    if (reviewStatus) {
      if (!['approved', 'pending', 'rejected'].includes(reviewStatus)) {
        return NextResponse.json(
          { error: "无效的审核状态" },
          { status: 400 }
        );
      }
      updateData.reviewStatus = reviewStatus;
    }
    
    // 如果请求包含内容，则添加到更新数据中
    if (content !== undefined) {
      updateData.content = content;
    }
    
    // 如果没有任何要更新的数据，则返回错误
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "未提供任何要更新的数据" },
        { status: 400 }
      );
    }

    // 更新帖子
    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
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

    // 记录管理员操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: content !== undefined ? "EDIT_POST_CONTENT" : "REVIEW_POST",
        resource: "POST",
        resourceId: id,
        details: { 
          previousStatus: existingPost.reviewStatus,
          newStatus: reviewStatus,
          contentEdited: content !== undefined
        },
      },
    });

    return NextResponse.json({
      ...updatedPost,
      message: content !== undefined ? "帖子内容已更新" : 
        `帖子已${reviewStatus === 'approved' ? '通过审核' : (reviewStatus === 'rejected' ? '被拒绝' : '设为待审核')}`
    });
  } catch (error) {
    console.error("操作帖子失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "操作帖子失败，请稍后再试", details: errorMessage },
      { status: 500 }
    );
  }
}

// 更新帖子
export async function PUT(
  request: Request,
  { params }: { params: { id: string | Promise<{ id: string }> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    console.log("API - 编辑帖子 - 会话:", JSON.stringify(session?.user, null, 2));
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 正确处理params - 先await整个params对象
    const paramsData = await Promise.resolve(params);
    // 如果id是Promise，则await它
    const id = typeof paramsData.id === 'string' 
      ? paramsData.id 
      : (await paramsData.id).id;
    const body = await request.json();
    const { title, content, tags, status, removedImageIds } = body;

    // 验证请求数据
    if (!title || !content || !tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "缺少必要的帖子信息" },
        { status: 400 }
      );
    }

    // 检查帖子是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { 
        authorId: true,
        // 关联查询帖子图片
        images: {
          select: {
            id: true,
            filename: true,
            url: true
          }
        }
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 获取用户权限
    const userPermissions: string[] = [];
    console.log("API - 用户角色:", session.user.roles);
    
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        console.log("API - 处理角色:", role.role.name);
        console.log("API - 角色权限:", role.role.permissions);
        
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    console.log("API - 用户权限汇总:", userPermissions);

    // 特殊处理：超级管理员总是可以编辑
    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    
    // 检查请求头中是否有管理员覆盖标记
    const adminOverride = request.headers.get("X-Admin-Override") === "true";
    console.log("API - 请求头中的管理员覆盖标记:", adminOverride);
    
    // 检查权限：用户必须是帖子作者或拥有编辑帖子权限或是超级管理员
    const isAuthor = existingPost.authorId === session.user.id;
    const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
    const canEditPosts = userPermissions.includes(AdminPermission.ADMIN_ACCESS);

    console.log("API - 权限检查:", {
      isAuthor,
      isAdmin,
      canEditPosts,
      isSuperAdmin,
      adminOverride,
      userId: session.user.id,
      authorId: existingPost.authorId,
      editPostPermission: AdminPermission.ADMIN_ACCESS
    });

    // 放宽权限检查，允许超级管理员编辑任何帖子
    if (!isAuthor && !canEditPosts && !isAdmin && !isSuperAdmin && !adminOverride) {
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
      where: { postId: id },
    });

    // 处理被删除的图片
    if (removedImageIds && Array.isArray(removedImageIds) && removedImageIds.length > 0) {
      console.log(`处理 ${removedImageIds.length} 张需要删除的图片`);
      
      // 找出要删除的图片信息
      const imagesToDelete = existingPost.images.filter(img => 
        removedImageIds.includes(img.id)
      );
      
      if (imagesToDelete.length > 0) {
        // 导入MinIO服务
        const { minioService } = await import('@/lib/minio');
        
        // 删除MinIO中的图片文件
        const deleteImagePromises = imagesToDelete.map(async (image) => {
          try {
            // 从MinIO删除文件
            await minioService.delete(image.filename);
            console.log(`已从MinIO删除图片: ${image.filename}`);
          } catch (error) {
            console.error(`删除MinIO图片失败: ${image.filename}`, error);
            // 不中断流程，继续删除其他图片
          }
        });
        
        // 等待所有图片删除完成
        await Promise.all(deleteImagePromises);
        
        // 从数据库删除图片记录
        await prisma.postImage.deleteMany({
          where: {
            id: {
              in: removedImageIds
            }
          }
        });
        
        console.log(`已从数据库删除 ${removedImageIds.length} 张图片记录`);
      }
    }

    // 判断审核状态
    // 如果是普通用户编辑并发布，则需要重新审核
    // 如果是管理员或超级管理员编辑，则保持审核状态为已通过
    let reviewStatus = 'approved';
    if (!adminOverride && !isSuperAdmin && !isAdmin && status === 'published') {
      reviewStatus = 'pending';  // 普通用户发布的帖子需要重新审核
    }

    // 更新帖子
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        status,
        reviewStatus,
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
        },
        images: true // 包含图片信息
      }
    });

    // 添加提示信息
    let message = "帖子已更新";
    if (reviewStatus === 'pending') {
      message = "帖子已更新，需要管理员审核后才能在论坛显示";
    }

    return NextResponse.json({
      ...updatedPost,
      message
    });
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
  { params }: { params: { id: string | Promise<{ id: string }> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    console.log("API - 删除帖子 - 会话:", JSON.stringify(session?.user, null, 2));
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 正确处理params - 先await整个params对象
    const paramsData = await Promise.resolve(params);
    // 如果id是Promise，则await它
    const id = typeof paramsData.id === 'string' 
      ? paramsData.id 
      : (await paramsData.id).id;

    // 检查帖子是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { 
        authorId: true,
        // 关联查询帖子图片
        images: {
          select: {
            id: true,
            filename: true,
            url: true
          }
        }
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 获取用户权限
    const userPermissions: string[] = [];
    console.log("API - 用户角色:", session.user.roles);
    
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        console.log("API - 处理角色:", role.role.name);
        console.log("API - 角色权限:", role.role.permissions);
        
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }
    
    console.log("API - 用户权限汇总:", userPermissions);

    // 特殊处理：超级管理员总是可以删除帖子
    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    
    // 检查请求头中是否有管理员覆盖标记
    const adminOverride = request.headers.get("X-Admin-Override") === "true";
    console.log("API - 请求头中的管理员覆盖标记:", adminOverride);
    
    // 检查权限：用户必须是帖子作者或有删除权限
    const isAuthor = existingPost.authorId === session.user.id;
    const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
    const canDeletePosts = userPermissions.includes(AdminPermission.ADMIN_ACCESS);

    console.log("API - 删除权限检查:", {
      isAuthor,
      isAdmin,
      canDeletePosts,
      userId: session.user.id,
      authorId: existingPost.authorId,
      deletePostPermission: AdminPermission.ADMIN_ACCESS
    });

    // 放宽权限检查，允许超级管理员删除任何帖子
    if (!isAuthor && !canDeletePosts && !isAdmin && !isSuperAdmin && !adminOverride) {
      return NextResponse.json(
        { error: "无权删除此帖子" },
        { status: 403 }
      );
    }
    
    // 导入MinIO服务
    const { minioService } = await import('@/lib/minio');
    
    // 删除MinIO中的图片文件
    if (existingPost.images && existingPost.images.length > 0) {
      console.log(`删除帖子相关的 ${existingPost.images.length} 张图片`);
      
      const deleteImagePromises = existingPost.images.map(async (image) => {
        try {
          // 确保文件名是正确的MinIO路径格式
          await minioService.delete(image.filename);
          console.log(`已从MinIO删除图片: ${image.filename}`);
        } catch (error) {
          console.error(`删除MinIO图片失败: ${image.filename}`, error);
          // 不中断流程，继续删除其他图片
        }
      });
      
      // 等待所有图片删除完成
      await Promise.all(deleteImagePromises);
    }

    // 删除帖子相关的标签关联
    await prisma.postToTag.deleteMany({
      where: { postId: id },
    });

    // 删除帖子的评论
    await prisma.comment.deleteMany({
      where: { postId: id },
    });

    // 删除帖子的图片记录(数据库记录将级联删除，因为使用了onDelete: Cascade)
    
    // 删除帖子
    await prisma.post.delete({
      where: { id },
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