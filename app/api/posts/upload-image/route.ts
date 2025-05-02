import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { minioService } from '@/lib/minio';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const postId = formData.get('postId') as string; // 可选：当前正在编辑的帖子ID
    
    // 日志输出，帮助调试
    console.log('图片上传请求:', {
      userId,
      postId: postId || '无关联帖子',
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    if (!file) {
      return NextResponse.json(
        { error: '请提供图片文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '仅支持上传图片文件' },
        { status: 400 }
      );
    }

    // 获取文件扩展名
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // 生成唯一文件名，保留原始扩展名
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    
    // 使用用户ID组织存储路径，确保每个用户的图片存储在独立目录
    // 如果没有postId，放在临时目录
    const filePath = postId 
      ? `users/${userId}/posts/images/${uniqueFileName}`
      : `users/${userId}/temp/images/${uniqueFileName}`;

    // 上传文件到MinIO
    await minioService.uploadFile(file, filePath);

    // 计算存储的图片URL - 无论临时还是正式，都使用相同的URL格式
    // 这样当图片从临时移动到正式路径后，URL不需要改变
    const fileUrl = `/api/posts/images/${userId}/${uniqueFileName}`;
    // 获取完整URL路径
    const fullFileUrl = `${request.headers.get('origin')}${fileUrl}`;

    let imageRecord = null;

    // 如果提供了帖子ID，并且有效，则关联图片到帖子
    if (postId) {
      try {
        // 验证帖子存在且属于当前用户
        const post = await prisma.post.findUnique({
          where: {
            id: postId,
            authorId: userId
          }
        });

        if (post) {
          // 创建图片关联记录
          imageRecord = await prisma.postImage.create({
            data: {
              postId,
              url: fullFileUrl,
              filename: filePath,
              size: file.size,
              type: file.type
            }
          });
        }
      } catch (err) {
        console.error('关联图片到帖子失败:', err);
        // 不中断流程，仍然返回上传成功的信息
      }
    } else {
      console.log('图片上传成功，但未关联到帖子（可能是新帖子）');
    }

    // 获取文件基础名称（不含路径和扩展名）
    const baseFileName = file.name.split('.').shift() || 'image';

    // 记录重要信息以便调试
    console.log('文件上传成功:', {
      filePath,
      fullFileUrl,
      baseFileName,
      postId: postId || '无关联帖子',
      isTemporary: !postId
    });

    // 构建响应对象
    const response = NextResponse.json({
      code: 0, // 0表示成功
      msg: '', // 成功时不需要消息
      data: {
        errFiles: [], // 空表示没有错误
        succMap: {
          [baseFileName]: fullFileUrl // 使用原文件名作为key，返回生成的URL作为值
        }
      }
    });

    // 添加CORS头
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Post-ID');
    
    return response;
  } catch (error) {
    console.error('上传图片失败:', error);
    
    // 构建错误响应对象
    const errorResponse = NextResponse.json({
      code: -1, // 非0表示失败
      msg: '上传图片失败，请稍后重试',
      data: {
        errFiles: ['upload-failed'],
        succMap: {}
      }
    }, { status: 500 });
    
    // 添加CORS头
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Post-ID');
    
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
} 