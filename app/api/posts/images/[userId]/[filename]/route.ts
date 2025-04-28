import { NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

export async function GET(
  request: Request,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    const { userId, filename } = params;

    if (!userId || !filename) {
      return NextResponse.json(
        { error: '无效的请求参数' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = `users/${userId}/posts/images/${filename}`;

    // 从MinIO下载文件
    const fileContent = await minioService.downloadFile(filePath);

    // 根据文件扩展名设置正确的Content-Type
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';

    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }

    // 返回文件内容，设置适当的Content-Type
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
      },
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    );
  }
} 