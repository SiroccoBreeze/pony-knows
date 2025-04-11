import { NextResponse } from 'next/server';
import { nextcloudService } from '@/lib/nextcloud';

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

    const fileContent = await nextcloudService.downloadFile(path);
    const buffer = Buffer.from(fileContent as Buffer);
    
    // 根据文件类型设置正确的 Content-Type
    const fileExtension = path.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (fileExtension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
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
      case 'txt':
        contentType = 'text/plain';
        break;
      // 可以添加更多文件类型
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Error in Nextcloud preview API:', error);
    return NextResponse.json(
      { error: 'Failed to preview file' },
      { status: 500 }
    );
  }
} 