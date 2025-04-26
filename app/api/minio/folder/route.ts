import { NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path } = body;
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    await minioService.createFolder(path);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in MinIO folder creation API:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
} 