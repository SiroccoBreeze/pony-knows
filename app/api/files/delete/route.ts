import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { PrismaClient } from '@prisma/client';
import { minioService } from '@/lib/minio';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求数据
    const body = await request.json();
    const { filename, fileId } = body;

    if (!filename) {
      return NextResponse.json(
        { error: '缺少文件路径信息' },
        { status: 400 }
      );
    }

    console.log(`尝试删除文件: ${filename}, fileId: ${fileId || '未提供'}`);

    // 检查文件是否存在
    let fileExists = false;
    try {
      fileExists = await minioService.fileExists(filename);
      console.log(`文件存在性检查结果: ${fileExists ? '存在' : '不存在'}`);
    } catch (error) {
      console.error(`检查文件存在性失败:`, error);
      return NextResponse.json(
        { error: '检查文件存在性失败', details: error },
        { status: 500 }
      );
    }

    if (!fileExists) {
      console.log(`文件不存在，无需删除: ${filename}`);
      return NextResponse.json(
        { message: '文件不存在，无需删除' },
        { status: 200 }
      );
    }

    // 执行文件删除
    try {
      await minioService.delete(filename);
      console.log(`已成功从MinIO删除文件: ${filename}`);
    } catch (error) {
      console.error(`从MinIO删除文件失败:`, error);
      return NextResponse.json(
        { error: '删除文件失败', details: error },
        { status: 500 }
      );
    }

    // 如果提供了fileId，还需要从数据库删除关联记录
    if (fileId) {
      try {
        // 从PostImage表中删除记录
        await prisma.postImage.delete({
          where: { id: fileId }
        });
        console.log(`已从数据库删除文件记录: ${fileId}`);
      } catch (dbError) {
        console.error(`从数据库删除文件记录失败:`, dbError);
        // 继续处理，不中断流程，因为MinIO文件已经删除
      }
    }

    return NextResponse.json(
      { success: true, message: '文件已成功删除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('处理文件删除请求失败:', error);
    return NextResponse.json(
      { error: '处理删除请求失败', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 