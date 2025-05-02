import { NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

export async function GET(
  request: Request,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    // 确保params是一个已解析的Promise对象
    const paramsData = await Promise.resolve(params);
    const { userId, filename } = paramsData;

    if (!userId || !filename) {
      return NextResponse.json(
        { error: '无效的请求参数' },
        { status: 400 }
      );
    }

    // 构建文件路径 - 先尝试正式路径
    let filePath = `users/${userId}/posts/images/${filename}`;
    let fileContent;

    try {
      // 尝试从正式路径下载文件
      fileContent = await minioService.downloadFile(filePath);
    } catch (error) {
      console.log(`文件不存在于正式路径，尝试临时路径: ${error}`);
      
      // 如果正式路径失败，尝试从临时路径获取
      filePath = `users/${userId}/temp/images/${filename}`;
      try {
        fileContent = await minioService.downloadFile(filePath);
      } catch (tempError) {
        console.error(`文件在临时路径也不存在: ${tempError}`);
        throw new Error('找不到请求的图片文件');
      }
    }

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