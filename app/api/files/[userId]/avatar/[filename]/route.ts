import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

// 获取头像MIME类型
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // 图片类型
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  
  // 默认图片类型
  return 'image/jpeg';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    // 先await参数
    const paramsData = await params;
    const userId = paramsData.userId;
    const filename = paramsData.filename;
    
    // 构建文件路径
    const filePath = `users/${userId}/avatar/${filename}`;
    
    // 检查文件是否存在
    const exists = await minioService.fileExists(filePath);
    if (!exists) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }
    
    // 获取文件内容
    const fileContent = await minioService.getFileBuffer(filePath);
    
    // 确定内容类型
    const contentType = getMimeType(filename);
    
    // 返回文件内容
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年缓存
      },
    });
  } catch (error) {
    console.error('获取头像失败:', error);
    return NextResponse.json(
      { error: '获取头像失败' },
      { status: 500 }
    );
  }
} 