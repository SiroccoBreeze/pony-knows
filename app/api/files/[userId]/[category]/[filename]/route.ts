import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

// 获取MIME类型
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // 图片类型
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  
  // 压缩文件
  if (ext === 'zip') return 'application/zip';
  if (ext === 'rar') return 'application/x-rar-compressed';
  if (ext === '7z') return 'application/x-7z-compressed';
  
  // 文档类型
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
  // 默认
  return 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; category: string; filename: string } }
) {
  try {
    // 确保params是一个已解析的Promise对象
    const paramsData = await Promise.resolve(params);
    const { userId, category, filename } = paramsData;
    
    // 构建可能的文件路径 - 正式目录和临时目录
    const paths = [];
    
    // 添加正式目录路径
    if (category === 'image') {
      paths.push(`users/${userId}/posts/images/${filename}`);
    } else if (category === 'archive') {
      paths.push(`users/${userId}/posts/archives/${filename}`);
    } else if (category === 'document') {
      paths.push(`users/${userId}/posts/documents/${filename}`);
    } else {
      paths.push(`users/${userId}/posts/other/${filename}`);
    }
    
    // 添加临时目录路径
    if (category === 'image') {
      paths.push(`users/${userId}/temp/images/${filename}`);
    } else if (category === 'archive') {
      paths.push(`users/${userId}/temp/archives/${filename}`);
    } else if (category === 'document') {
      paths.push(`users/${userId}/temp/documents/${filename}`);
    } else {
      paths.push(`users/${userId}/temp/other/${filename}`);
    }
    
    // 尝试从各个可能的路径获取文件
    let fileBuffer = null;
    let successPath = '';
    
    // 先尝试正式目录再尝试临时目录
    for (const path of paths) {
      try {
        console.log(`尝试从路径获取文件: ${path}`);
        fileBuffer = await minioService.getFileBuffer(path);
        if (fileBuffer) {
          successPath = path;
          console.log(`成功从路径获取文件: ${path}`);
          break;
        }
      } catch (error) {
        console.log(`从路径获取文件失败: ${path}`, error);
        // 继续尝试下一个路径
      }
    }
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: '文件不存在', paths },
        { status: 404 }
      );
    }
    
    // 确定MIME类型
    const contentType = getMimeType(filename);
    
    // 构建响应
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
        'X-File-Path': successPath // 添加成功路径到响应头，便于调试
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('获取文件失败:', error);
    return NextResponse.json(
      { error: '获取文件失败' },
      { status: 500 }
    );
  }
} 