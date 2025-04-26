import { NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const fileContent = await minioService.downloadFile(path);
    const filename = path.split('/').pop() || 'file';
    
    // 使用 encodeURIComponent 处理中文文件名
    const encodedFilename = encodeURIComponent(filename);
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('Error in MinIO download API:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
} 