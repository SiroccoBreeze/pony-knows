import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prisma";

// 获取用户通知列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const read = searchParams.get("read");
    
    // 构建查询条件
    const where: any = { userId: session.user.id };
    
    // 如果指定了已读/未读状态
    if (read === "true") {
      where.read = true;
    } else if (read === "false") {
      where.read = false;
    }
    
    // 获取通知总数
    const total = await prisma.notification.count({ where });
    
    // 获取通知列表
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return NextResponse.json({
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("获取通知列表失败:", error);
    return NextResponse.json({ error: "获取通知列表失败" }, { status: 500 });
  }
}

// 创建通知
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查是否是管理员操作
    const isAdmin = req.headers.get("X-Admin-Request") === "true";
    
    if (!session?.user && !isAdmin) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    
    const data = await req.json();
    const { userId, type, title, content, relatedId, relatedType } = data;
    
    if (!userId || !type || !title || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    
    // 创建通知
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        relatedId,
        relatedType,
        read: false,
      }
    });
    
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("创建通知失败:", error);
    return NextResponse.json({ error: "创建通知失败" }, { status: 500 });
  }
}

// 批量标记通知为已读
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    
    const data = await req.json();
    const { ids, all } = data;
    
    if (all) {
      // 标记所有通知为已读
      await prisma.notification.updateMany({
        where: { userId: session.user.id },
        data: { read: true }
      });
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // 标记指定通知为已读
      await prisma.notification.updateMany({
        where: { 
          id: { in: ids },
          userId: session.user.id // 确保只能标记自己的通知
        },
        data: { read: true }
      });
    } else {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("标记通知已读失败:", error);
    return NextResponse.json({ error: "标记通知已读失败" }, { status: 500 });
  }
} 