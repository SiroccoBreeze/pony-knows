import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { minioService } from '@/lib/minio';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getSystemParameterFromDb } from '@/lib/system-parameters';

const prisma = new PrismaClient();

// 获取文件分类
function getFileCategory(mimeType: string): 'image' | 'archive' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('officedocument')) return 'document';
  return 'other';
}

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

    // 检查上传功能是否启用
    const uploadEnabled = await getSystemParameterFromDb('upload_enabled');
    if (uploadEnabled === 'false') {
      return NextResponse.json(
        { error: '文件上传功能已禁用' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const postId = formData.get('postId') as string; // 可选：当前正在编辑的帖子ID
    
    // 日志输出，帮助调试
    console.log('文件上传请求:', {
      userId,
      postId: postId || '无关联帖子',
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });
    
    if (!file) {
      return NextResponse.json(
        { error: '请提供上传文件' },
        { status: 400 }
      );
    }

    // 1. 检查文件大小限制
    const maxFileSizeMBStr = await getSystemParameterFromDb('upload_max_file_size_mb');
    const maxFileSizeMB = maxFileSizeMBStr ? parseFloat(maxFileSizeMBStr) : 5; // 默认5MB
    const maxFileSize = maxFileSizeMB * 1024 * 1024; // 转换为字节
    
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `文件大小超过限制，最大允许${maxFileSizeMB}MB` },
        { status: 400 }
      );
    }

    // 2. 检查文件类型限制
    const allowedFileTypesStr = await getSystemParameterFromDb('upload_allowed_file_types');
    const allowedFileTypes = allowedFileTypesStr ? allowedFileTypesStr.split(',') : [];
    
    // 检查文件是否在允许的类型列表中
    if (!allowedFileTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}，允许的类型: ${allowedFileTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 获取文件类别（用于组织存储）
    const fileCategory = getFileCategory(file.type);

    // 获取文件扩展名
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // 生成唯一文件名，保留原始扩展名
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    
    // 根据文件类型确定存储路径
    let filePath;
    if (fileCategory === 'image') {
      filePath = postId 
        ? `users/${userId}/posts/images/${uniqueFileName}`
        : `users/${userId}/temp/images/${uniqueFileName}`;
    } else if (fileCategory === 'archive') {
      filePath = postId 
        ? `users/${userId}/posts/archives/${uniqueFileName}`
        : `users/${userId}/temp/archives/${uniqueFileName}`;
    } else if (fileCategory === 'document') {
      filePath = postId 
        ? `users/${userId}/posts/documents/${uniqueFileName}`
        : `users/${userId}/temp/documents/${uniqueFileName}`;
    } else {
      filePath = postId 
        ? `users/${userId}/posts/other/${uniqueFileName}`
        : `users/${userId}/temp/other/${uniqueFileName}`;
    }

    // 上传文件到MinIO
    await minioService.uploadFile(file, filePath);

    // 构建URL路径
    const urlPath = `/api/files/${userId}/${fileCategory}/${uniqueFileName}`;
    
    // 获取完整URL路径
    const fullFileUrl = `${request.headers.get('origin')}${urlPath}`;

    // 如果提供了帖子ID，并且有效，则关联文件到帖子
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
          // 创建文件关联记录
          await prisma.postImage.create({
            data: {
              postId,
              url: fullFileUrl,
              filename: filePath,
              size: file.size,
              type: file.type
            }
          });
          console.log('已关联文件到帖子:', postId);
        }
      } catch (err) {
        console.error('关联文件到帖子失败:', err);
        // 不中断流程，仍然返回上传成功的信息
      }
    } else {
      console.log('文件上传成功，但未关联到帖子（可能是新帖子）');
    }

    // 获取文件基础名称（不含路径和扩展名）
    const baseFileName = file.name.split('.').shift() || 'file';

    // 记录重要信息以便调试
    console.log('文件上传成功:', {
      filePath,
      fullFileUrl,
      baseFileName,
      postId: postId || '无关联帖子',
      isTemporary: !postId,
      fileType: file.type,
      fileCategory
    });

    // 构建响应对象
    const response = NextResponse.json({
      code: 0, // 0表示成功
      msg: '', // 成功时不需要消息
      data: {
        errFiles: [], // 空表示没有错误
        succMap: {
          [baseFileName]: {
            url: fullFileUrl,
            type: file.type,
            name: file.name,
            size: file.size,
            category: fileCategory
          }
        }
      }
    });

    // 添加CORS头
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Post-ID');
    
    return response;
  } catch (error) {
    console.error('上传文件失败:', error);
    
    // 构建错误响应对象
    const errorResponse = NextResponse.json({
      code: -1, // 非0表示失败
      msg: '上传文件失败，请稍后重试',
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