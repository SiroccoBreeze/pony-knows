import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log("尝试创建测试帖子...");
    
    // 寻找或创建一个测试用户
    let testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });
    
    if (!testUser) {
      console.log("创建测试用户...");
      testUser = await prisma.user.create({
        data: {
          email: "test@example.com",
          name: "测试用户",
          // 注意：这里不设置密码，仅用于测试
        },
      });
    }
    
    console.log("测试用户ID:", testUser.id);
    
    // 寻找或创建测试标签
    const testTag = await prisma.tag.upsert({
      where: { name: "测试" },
      update: {},
      create: { name: "测试" },
    });
    
    console.log("测试标签ID:", testTag.id);
    
    // 创建测试帖子
    const testPost = await prisma.post.create({
      data: {
        title: "测试帖子 " + new Date().toLocaleString(),
        content: "这是一个自动创建的测试帖子。\n\n## 包含Markdown格式\n\n- 列表项1\n- 列表项2\n\n```javascript\nconsole.log('Hello World');\n```",
        authorId: testUser.id,
        status: "published",
        views: 0,
        postTags: {
          create: [
            {
              tagId: testTag.id,
            },
          ],
        },
      },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        author: true,
      },
    });
    
    console.log("测试帖子创建成功:", testPost.id);
    
    return NextResponse.json({
      success: true,
      message: "测试帖子创建成功",
      post: {
        id: testPost.id,
        title: testPost.title,
        url: `/forum/post/${testPost.id}`,
      },
    });
  } catch (error) {
    console.error("创建测试帖子失败:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        success: false,
        error: "创建测试帖子失败",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 