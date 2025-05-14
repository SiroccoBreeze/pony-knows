import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 获取用户未读通知数量
    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("获取未读通知数量失败:", error);
    return NextResponse.json({ error: "获取未读通知数量失败" }, { status: 500 });
  }
} 