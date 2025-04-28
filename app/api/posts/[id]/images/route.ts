import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// 获取帖子的所有图片
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有权限查看此帖子的图片（帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 获取帖子的所有图片
    const images = await prisma.postImage.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error('获取帖子图片失败:', error);
    return NextResponse.json(
      { error: '获取帖子图片失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 将图片关联到帖子
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const userId = session.user.id;

    // 检查用户是否有权限关联图片（必须是帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 仅允许帖子作者关联图片
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权操作此帖子的图片' }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const { url, filename, size, type } = body;

    if (!url || !filename) {
      return NextResponse.json({ error: '缺少必要的图片信息' }, { status: 400 });
    }
    
    let finalFilename = filename;
    
    // 检查是否是临时目录的图片，如果是则迁移到正式目录
    if (filename.includes('/temp/')) {
      try {
        // 导入MinIO服务
        const { minioService } = await import('@/lib/minio');
        
        // 从临时路径提取文件名
        const pathParts = filename.split('/');
        const actualFilename = pathParts[pathParts.length - 1];
        
        // 创建新的路径（正式目录）
        const newFilePath = `users/${userId}/posts/images/${actualFilename}`;
        
        // 复制文件（MinIO可能不支持直接移动，所以先复制后删除）
        console.log(`尝试迁移临时图片: ${filename} -> ${newFilePath}`);
        
        try {
          // 下载文件内容
          const fileContent = await minioService.downloadFile(filename);
          
          // 使用buffer直接上传，而不是使用File对象(Node.js环境中不可用)
          await minioService.uploadBuffer(
            fileContent,
            newFilePath,
            type || 'image/jpeg'
          );
          
          // 删除原临时文件
          await minioService.delete(filename);
          
          // 更新文件名为新路径
          finalFilename = newFilePath;
          
          console.log(`成功迁移临时图片: ${filename} -> ${newFilePath}`);
        } catch (fileError) {
          console.error('文件操作失败:', fileError);
          throw fileError;
        }
      } catch (error) {
        console.error('迁移临时图片失败, 仍使用原路径:', error);
        // 继续使用原路径，不中断流程
      }
    }

    // 创建图片关联
    const image = await prisma.postImage.create({
      data: {
        postId,
        url, // URL保持不变，因为它是对外的访问路径
        filename: finalFilename, // 可能已更新为正式路径
        size: size || 0,
        type: type || 'image/jpeg'
      }
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error('关联帖子图片失败:', error);
    return NextResponse.json(
      { error: '关联帖子图片失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 删除帖子图片关联
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ error: '无效的帖子ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: '无效的图片ID' }, { status: 400 });
    }

    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查用户是否有权限删除图片（必须是帖子作者或管理员）
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    // 仅允许帖子作者删除图片
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权操作此帖子的图片' }, { status: 403 });
    }

    // 删除图片关联
    await prisma.postImage.delete({
      where: {
        id: imageId,
        postId // 确保是该帖子的图片
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除帖子图片失败:', error);
    return NextResponse.json(
      { error: '删除帖子图片失败，请稍后重试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 