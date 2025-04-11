import { NextResponse } from 'next/server';
import { nextcloudService } from '@/lib/nextcloud';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';
    
    const files = await nextcloudService.listFiles(path);
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error in Nextcloud API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: 'File and path are required' },
        { status: 400 }
      );
    }

    await nextcloudService.uploadFile(file, path);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Nextcloud API:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 