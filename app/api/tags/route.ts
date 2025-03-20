import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 获取所有标签
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { postTags: true }
        }
      },
      orderBy: {
        postTags: {
          _count: 'desc'
        }
      }
    });

    // 格式化标签数据以匹配前端预期的格式
    const formattedTags = tags.map(tag => ({
      name: tag.name,
      count: tag._count.postTags,
      // 这里可以添加description字段，如果数据库中有的话
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error("获取标签失败:", error);
    return NextResponse.json(
      { error: "获取标签失败" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 