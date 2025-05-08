import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// 获取帖子的所有文件
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 确保params是已解析的
    const paramsData = await Promise.resolve(params);
    const postId = paramsData.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有权限查看此帖子的文件（帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 获取帖子的所有文件
    const files = await prisma.postImage.findMany({
      where: { 
        postId,
        // 排除图片类型，只获取其他类型的文件
        NOT: {
          type: {
            startsWith: 'image/'
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('获取帖子文件失败:', error);
    return NextResponse.json(
      { error: '获取帖子文件失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 将文件关联到帖子
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 确保params是已解析的
    const paramsData = await Promise.resolve(params);
    const postId = paramsData.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const userId = session.user.id;

    // 检查用户是否有权限关联文件（必须是帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        authorId: true,
        // 添加文件关联信息，用于检查重复
        images: {
          select: {
            id: true,
            url: true,
            filename: true
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 仅允许帖子作者关联文件
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权操作此帖子的文件' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const { url, filename, size, type, category } = body;

    if (!url || !filename) {
      return NextResponse.json({ error: '缺少必要的文件信息' }, { status: 400 });
    }
    
    // 检查是否已经有相同URL的文件关联
    const existingFileByUrl = post.images?.find(img => img.url === url);
    if (existingFileByUrl) {
      console.log(`文件已通过URL关联到帖子: ${url}`);
      return NextResponse.json({ 
        message: '文件已关联', 
        existingFile: existingFileByUrl,
        type: 'url_exists'
      });
    }
    
    // 提取文件名进行比较
    const baseFilename = filename.split('/').pop() || '';
    
    // 检查是否已经有相同文件名的文件关联
    const existingFileBySimilarName = post.images?.find(img => {
      const imgFilename = img.filename.split('/').pop() || '';
      return imgFilename === baseFilename;
    });
    
    if (existingFileBySimilarName) {
      console.log(`发现类似文件名已关联: ${baseFilename}`);
      return NextResponse.json({ 
        message: '类似文件已关联', 
        existingFile: existingFileBySimilarName,
        type: 'similar_filename'
      });
    }
    
    let finalFilename = filename;
    
    // 获取文件类别
    const fileCategory = category || 'other';
    
    // 检查是否是临时目录的文件，如果是则迁移到正式目录
    if (filename.includes('/temp/')) {
      try {
        // 导入MinIO服务
        const { minioService } = await import('@/lib/minio');
        
        // 从临时路径提取文件名
        const pathParts = filename.split('/');
        const actualFilename = pathParts[pathParts.length - 1];
        
        // 创建新的路径（正式目录）
        const newFilePath = `users/${userId}/posts/${fileCategory}s/${actualFilename}`;
        
        // 复制文件（MinIO可能不支持直接移动，所以先复制后删除）
        console.log(`尝试迁移临时文件: ${filename} -> ${newFilePath}`);
        
        try {
          // 检查目标路径是否已存在同名文件
          let isExistingFile = false;
          try {
            isExistingFile = await minioService.fileExists(newFilePath);
            if (isExistingFile) {
              console.log(`目标路径已存在同名文件: ${newFilePath}`);
            } else {
              console.log(`目标路径不存在同名文件，可以安全迁移: ${newFilePath}`);
            }
          } catch (e) {
            console.error(`检查文件是否存在失败:`, e);
            // 默认为不存在，继续迁移
            isExistingFile = false;
          }
          
          let updatedFilePath = newFilePath;
          
          if (isExistingFile) {
            // 如果已存在同名文件，生成一个新的文件名（添加时间戳）
            const timestamp = Date.now();
            const fileExt = actualFilename.includes('.') ? actualFilename.split('.').pop() : '';
            const baseName = actualFilename.includes('.') ? actualFilename.substring(0, actualFilename.lastIndexOf('.')) : actualFilename;
            const newFilename = `${baseName}_${timestamp}.${fileExt}`;
            updatedFilePath = `users/${userId}/posts/${fileCategory}s/${newFilename}`;
            console.log(`生成新的文件名避免冲突: ${updatedFilePath}`);
          }
          
          // 下载文件内容
          const fileContent = await minioService.downloadFile(filename);
          
          // 使用buffer直接上传，而不是使用File对象(Node.js环境中不可用)
          await minioService.uploadBuffer(
            fileContent,
            updatedFilePath,
            type || 'application/octet-stream'
          );
          
          // 删除原临时文件
          await minioService.delete(filename);
          
          // 更新文件名为新路径
          finalFilename = updatedFilePath;
          
          console.log(`成功迁移临时文件: ${filename} -> ${updatedFilePath}`);
        } catch (fileError) {
          console.error('文件操作失败:', fileError);
          throw fileError;
        }
      } catch (error) {
        console.error('迁移临时文件失败, 仍使用原路径:', error);
        // 继续使用原路径，不中断流程
      }
    } else {
      console.log(`文件路径不在临时目录，不需要迁移: ${filename}`);
    }

    // 创建文件关联
    const file = await prisma.postImage.create({
      data: {
        postId,
        url, // URL保持不变，因为它是对外的访问路径
        filename: finalFilename, // 可能已更新为正式路径
        size: size || 0,
        type: type || 'application/octet-stream'
      }
    });

    console.log(`成功关联文件: URL=${url}, 存储路径=${finalFilename}`);

    return NextResponse.json(file);
  } catch (error) {
    console.error('关联帖子文件失败:', error);
    return NextResponse.json(
      { error: '关联帖子文件失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 删除帖子文件关联
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 确保params是已解析的
    const paramsData = await Promise.resolve(params);
    const postId = paramsData.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: '无效的文件ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有权限删除文件（必须是帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 仅允许帖子作者删除文件
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权操作此帖子的文件' }, { status: 403 });
    }

    // 删除文件关联
    await prisma.postImage.delete({
      where: {
        id: fileId,
        postId // 确保是该帖子的文件
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除帖子文件失败:', error);
    return NextResponse.json(
      { error: '删除帖子文件失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 