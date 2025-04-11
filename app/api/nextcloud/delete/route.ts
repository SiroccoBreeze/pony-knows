import { NextResponse } from 'next/server';
import { nextcloudService } from '@/lib/nextcloud';

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

    await nextcloudService.delete(path);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Nextcloud delete API:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 