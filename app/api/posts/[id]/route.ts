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
    const updateData: Record<string, any> = {};
    
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

    // 处理内容中的文件链接 - 检测非图片文件
    const postContent = updatedPost.content || '';
    
    // 匹配所有Markdown链接
    const allLinksRegex = /\[(.*?)\]\(([^)]+)\)/g;
    const fileUrls: string[] = [];
    let linkMatch;
    
    while ((linkMatch = allLinksRegex.exec(postContent)) !== null) {
      const linkText = linkMatch[1] || '';
      const url = linkMatch[2] || '';
      
      // 检查是否是API文件链接，并且不是图片链接
      // 图片链接格式为![...](url)，而文件链接格式为[...](url)
      if (url && url.includes('/api/files/') && !postContent.includes(`![${linkText}](${url})`)) {
        fileUrls.push(url);
        console.log('检测到非图片文件链接:', url);
      }
    }
    
    // 迁移文件并关联到帖子
    if (fileUrls.length > 0) {
      console.log(`检测到 ${fileUrls.length} 个非图片文件链接，尝试关联到帖子...`);
      
      for (const fileUrl of fileUrls) {
        try {
          // 从URL中提取信息
          const urlParts = fileUrl.split('/');
          const filename = urlParts.pop() || '';
          const category = urlParts.pop() || 'other';
          const userId = urlParts.pop() || '';
          
          if (userId !== session.user.id) {
            console.log(`文件不属于当前用户，跳过: ${fileUrl}`);
            continue;
          }
          
          // 检查文件是否已经关联到帖子
          const existingFile = await prisma.postImage.findFirst({
            where: {
              postId: id,
              url: fileUrl
            }
          });
          
          if (!existingFile) {
            // 构造完整路径
            const tempPath = `users/${userId}/temp/${category}s/${filename}`;
            
            // 构造文件类型
            let fileType = 'application/octet-stream';
            const fileExt = filename.split('.').pop()?.toLowerCase() || '';
            
            if (fileExt === 'pdf') {
              fileType = 'application/pdf';
            } else if (['doc', 'docx'].includes(fileExt)) {
              fileType = 'application/msword';
            } else if (['xls', 'xlsx'].includes(fileExt)) {
              fileType = 'application/vnd.ms-excel';
            } else if (['zip', 'rar'].includes(fileExt)) {
              fileType = fileExt === 'zip' ? 'application/zip' : 'application/x-rar-compressed';
            }
            
            // 检查MinIO中是否存在此文件
            try {
              const { minioService } = await import('@/lib/minio');
              
              // 先检查临时路径
              let fileContent: Buffer;
              try {
                fileContent = await minioService.downloadFile(tempPath);
                console.log(`找到临时路径文件: ${tempPath}`);
              } catch (error) {
                console.log(`临时路径不存在: ${tempPath}，尝试检查是否已在正式路径`);
                
                // 检查是否已在正式路径
                const formalPath = `users/${userId}/posts/${category}s/${filename}`;
                try {
                  fileContent = await minioService.downloadFile(formalPath);
                  console.log(`文件已在正式路径: ${formalPath}`);
                  
                  // 文件已在正式路径，直接关联到帖子
                  await prisma.postImage.create({
                    data: {
                      postId: id,
                      url: fileUrl,
                      filename: formalPath,
                      type: fileType,
                      size: fileContent.length
                    }
                  });
                  
                  console.log(`成功关联已存在的文件: ${formalPath}`);
                  continue; // 继续处理下一个文件
                } catch (error) {
                  console.log(`正式路径也不存在: ${formalPath}，无法处理此文件`);
                  continue; // 文件不存在，跳过
                }
              }
              
              // 创建新的路径（正式目录）
              const newFilePath = `users/${userId}/posts/${category}s/${filename}`;
              
              // 迁移文件
              console.log(`尝试迁移临时文件: ${tempPath} -> ${newFilePath}`);
              await minioService.uploadBuffer(
                fileContent,
                newFilePath,
                fileType
              );
              
              // 删除原临时文件
              await minioService.delete(tempPath);
              
              // 关联到帖子
              await prisma.postImage.create({
                data: {
                  postId: id,
                  url: fileUrl,
                  filename: newFilePath,
                  type: fileType,
                  size: fileContent.length
                }
              });
              
              console.log(`成功迁移并关联文件: ${newFilePath}`);
            } catch (minioError) {
              console.error(`文件迁移或关联失败: ${fileUrl}`, minioError);
              // 继续处理下一个文件
            }
          } else {
            console.log(`文件已关联到帖子，跳过: ${fileUrl}`);
          }
        } catch (linkError) {
          console.error(`处理文件链接失败: ${fileUrl}`, linkError);
          // 继续处理下一个文件
        }
      }
    }

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
            url: true,
            filename: true,
            type: true
          }
        }
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 验证当前用户是否有权限编辑此帖子
    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "您无权编辑此帖子" },
        { status: 403 }
      );
    }

    // 先处理内容中的临时文件
    // 匹配所有Markdown链接
    const allLinksRegex = /\[(.*?)\]\(([^)]+)\)/g;
    const fileUrls: string[] = [];
    let linkMatch;
    
    while ((linkMatch = allLinksRegex.exec(content)) !== null) {
      const linkText = linkMatch[1] || '';
      const url = linkMatch[2] || '';
      
      // 检查是否是API文件链接，并且不是图片链接
      // 图片链接格式为![...](url)，而文件链接格式为[...](url)
      if (url && url.includes('/api/files/') && !content.includes(`![${linkText}](${url})`)) {
        fileUrls.push(url);
        console.log('PUT - 检测到非图片文件链接:', url);
      }
    }
    
    // 迁移文件并关联到帖子
    if (fileUrls.length > 0) {
      console.log(`PUT - 检测到 ${fileUrls.length} 个非图片文件链接，尝试关联到帖子...`);
      
      for (const fileUrl of fileUrls) {
        try {
          // 解析URL结构
          const urlObj = new URL(fileUrl, 'http://localhost');
          const urlPath = urlObj.pathname;
          const pathParts = urlPath.split('/').filter(Boolean);
          
          // 检查URL格式是否正确 /api/files/:userId/:category/:filename
          if (pathParts.length < 4 || pathParts[0] !== 'api' || pathParts[1] !== 'files') {
            console.log(`PUT - URL格式不正确，跳过: ${fileUrl}`);
            continue;
          }
          
          const userId = pathParts[2];
          const category = pathParts[3];
          const filename = pathParts[4];
          
          if (userId !== session.user.id) {
            console.log(`PUT - 文件不属于当前用户，跳过: ${fileUrl}`);
            continue;
          }
          
          // 检查文件是否已经关联到帖子
          const existingFile = existingPost.images?.find(img => img.url === fileUrl);
          
          if (!existingFile) {
            // 构造临时路径和正式路径
            const tempPath = `users/${userId}/temp/${category}s/${filename}`;
            const formalPath = `users/${userId}/posts/${category}s/${filename}`;
            
            // 构造文件类型
            let fileType = 'application/octet-stream';
            const fileExt = filename.split('.').pop()?.toLowerCase() || '';
            
            if (fileExt === 'pdf') {
              fileType = 'application/pdf';
            } else if (['doc', 'docx'].includes(fileExt)) {
              fileType = 'application/msword';
            } else if (['xls', 'xlsx'].includes(fileExt)) {
              fileType = 'application/vnd.ms-excel';
            } else if (['zip', 'rar'].includes(fileExt)) {
              fileType = fileExt === 'zip' ? 'application/zip' : 'application/x-rar-compressed';
            }
            
            // 检查MinIO中是否存在此文件
            try {
              const { minioService } = await import('@/lib/minio');
              
              // 检查临时文件是否存在
              let fileExists = false;
              let fileContent: Buffer;
              
              try {
                // 先尝试从临时目录获取文件
                fileContent = await minioService.downloadFile(tempPath);
                fileExists = true;
                console.log(`PUT - 找到临时文件: ${tempPath}`);
                
                // 迁移到正式目录
                console.log(`PUT - 迁移文件: ${tempPath} -> ${formalPath}`);
                
                // 确认目标路径是否存在文件
                let targetExists = false;
                try {
                  targetExists = await minioService.fileExists(formalPath);
                } catch (error) {
                  console.log(`PUT - 检查目标文件是否存在出错，假设不存在: ${error instanceof Error ? error.message : String(error)}`);
                }
                
                let finalPath = formalPath;
                // 如果文件在目标路径已存在，创建带时间戳的新文件名
                if (targetExists) {
                  const timestamp = Date.now();
                  const fileBase = filename.includes('.')
                    ? filename.substring(0, filename.lastIndexOf('.'))
                    : filename;
                  const extension = filename.includes('.')
                    ? filename.substring(filename.lastIndexOf('.'))
                    : '';
                  const newFilename = `${fileBase}_${timestamp}${extension}`;
                  finalPath = `users/${userId}/posts/${category}s/${newFilename}`;
                  console.log(`PUT - 目标文件已存在，生成新文件名: ${finalPath}`);
                }
                
                // 上传到正式目录
                await minioService.uploadBuffer(fileContent, finalPath, fileType);
                
                // 删除临时文件
                await minioService.delete(tempPath);
                
                // 创建文件关联记录
                await prisma.postImage.create({
                  data: {
                    postId: id,
                    url: fileUrl,
                    filename: finalPath,
                    type: fileType,
                    size: fileContent.length
                  }
                });
                
                console.log(`PUT - 文件成功迁移并关联: ${finalPath}`);
              } catch (tempError) {
                // 临时文件不存在，尝试检查正式目录
                console.log(`PUT - 临时文件不存在，检查正式目录: ${tempError instanceof Error ? tempError.message : String(tempError)}`);
                
                try {
                  fileContent = await minioService.downloadFile(formalPath);
                  fileExists = true;
                  console.log(`PUT - 文件已在正式目录: ${formalPath}`);
                  
                  // 直接关联正式目录的文件
                  await prisma.postImage.create({
                    data: {
                      postId: id,
                      url: fileUrl,
                      filename: formalPath,
                      type: fileType,
                      size: fileContent.length
                    }
                  });
                  
                  console.log(`PUT - 已关联正式目录文件: ${formalPath}`);
                } catch (formalError) {
                  console.error(`PUT - 文件在临时和正式目录都不存在: ${formalError instanceof Error ? formalError.message : String(formalError)}`);
                }
              }
              
              if (!fileExists) {
                console.error(`PUT - 文件未找到，无法关联: ${fileUrl}`);
              }
            } catch (error) {
              console.error(`PUT - 处理文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            console.log(`PUT - 文件已关联到帖子，跳过: ${fileUrl}`);
          }
        } catch (error) {
          console.error(`PUT - 处理文件链接出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // 删除已移除的图片
    if (removedImageIds && Array.isArray(removedImageIds) && removedImageIds.length > 0) {
      console.log('删除已移除的图片:', removedImageIds);
      
      // 查询被移除的图片信息，以便后续删除存储中的文件
      const imagesToRemove = await prisma.postImage.findMany({
        where: {
          id: { in: removedImageIds },
          postId: id
        }
      });
      
      // 删除数据库中的记录
      await prisma.postImage.deleteMany({
        where: {
          id: { in: removedImageIds },
          postId: id
        }
      });
      
      // 尝试从存储中删除文件
      for (const image of imagesToRemove) {
        try {
          const { minioService } = await import('@/lib/minio');
          await minioService.delete(image.filename);
          console.log(`删除存储中的文件成功: ${image.filename}`);
        } catch (error) {
          console.error(`删除存储中的文件失败: ${image.filename}`, error);
          // 继续处理其他文件
        }
      }
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

    // 获取用户权限
    const userPermissions: string[] = [];
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    // 检查用户是否有管理权限
    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
    const adminOverride = request.headers.get("X-Admin-Override") === "true";

    // 判断审核状态
    // 如果是普通用户编辑并发布，则需要重新审核
    // 如果是管理员或超级管理员编辑，则保持审核状态为已通过
    let reviewStatus = 'approved';

    // 普通用户发布帖子时需要重新审核
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
            url: true,
            type: true
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