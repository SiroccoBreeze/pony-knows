import { NextResponse } from 'next/server';
import { minioService } from '@/lib/minio';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    await minioService.delete(path);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in MinIO delete API:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 