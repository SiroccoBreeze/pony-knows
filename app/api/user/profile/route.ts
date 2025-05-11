import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { minioService } from '@/lib/minio';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// 从图片URL中提取文件路径
function extractPathFromImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  
  // 从URL中提取用户ID和文件名
  // 格式应该是: http(s)://domain/api/files/userId/avatar/filename.ext
  try {
    const urlParts = imageUrl.split('/');
    const userId = urlParts[urlParts.length - 3];
    const avatarPart = urlParts[urlParts.length - 2];
    const filename = urlParts[urlParts.length - 1].split('?')[0]; // 移除可能的查询参数
    
    if (userId && avatarPart === 'avatar' && filename) {
      return `users/${userId}/avatar/${filename}`;
    }
  } catch (error) {
    console.error('从URL提取文件路径失败:', error);
  }
  
  return null;
}

// 更新用户个人资料
export async function PUT(request: Request) {
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
    
    // 解析请求数据
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const avatar = formData.get('avatar') as File | null;
    
    // 验证昵称
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '昵称不能为空' },
        { status: 400 }
      );
    }
    
    // 获取用户当前信息，包括当前头像
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        image: true
      }
    });
    
    // 准备更新数据
    const updateData: any = {
      name: name.trim(),
      bio: bio || null,
    };
    
    // 如果上传了新头像，处理头像上传
    if (avatar) {
      // 验证文件类型
      if (!avatar.type.startsWith('image/')) {
        return NextResponse.json(
          { error: '头像必须是图片格式' },
          { status: 400 }
        );
      }
      
      // 检查文件大小限制 (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (avatar.size > maxSize) {
        return NextResponse.json(
          { error: '头像大小不能超过5MB' },
          { status: 400 }
        );
      }
      
      // 获取文件扩展名
      const fileExtension = avatar.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // 生成唯一文件名
      const uniqueFileName = `${randomUUID()}.${fileExtension}`;
      
      // 存储路径
      const filePath = `users/${userId}/avatar/${uniqueFileName}`;
      
      // 上传文件到MinIO
      await minioService.uploadFile(avatar, filePath);
      
      // 构建URL路径
      const origin = request.headers.get('origin') || '';
      const imageUrl = `${origin}/api/files/${userId}/avatar/${uniqueFileName}`;
      
      // 添加到更新数据
      updateData.image = imageUrl;
      
      // 删除旧头像文件
      if (currentUser?.image) {
        // 从URL中提取文件路径
        const oldImagePath = extractPathFromImageUrl(currentUser.image);
        if (oldImagePath) {
          try {
            // 检查文件是否存在
            const exists = await minioService.fileExists(oldImagePath);
            if (exists) {
              // 删除旧文件
              await minioService.delete(oldImagePath);
              console.log('已删除旧头像:', oldImagePath);
            }
          } catch (error) {
            console.error('删除旧头像失败:', error);
            // 继续执行，不阻止更新用户信息
          }
        }
      }
    }
    
    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        // 直接忽略TS错误
        // @ts-ignore - 我们已经添加了bio字段，但TypeScript定义尚未更新
        bio: true,
      }
    });
    
    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('更新个人资料失败:', error);
    return NextResponse.json(
      { error: '更新个人资料失败，请稍后再试' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 