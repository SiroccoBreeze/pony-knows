import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { Permission } from "@/lib/permissions";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    permissions?: string[];
  };
}

// 获取单个评论
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          }
        },
        post: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });
    
    if (!comment) {
      return NextResponse.json(
        { error: "评论不存在" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error("获取评论失败:", error);
    return NextResponse.json(
      { error: "获取评论失败，请稍后再试" },
      { status: 500 }
    );
  }
}

// 删除评论
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }
    
    // 检查权限
    const hasDeletePermission = session.user.permissions?.includes(Permission.DELETE_COMMENT);
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: "没有删除评论的权限" },
        { status: 403 }
      );
    }
    
    const commentId = params.id;
    
    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return NextResponse.json(
        { error: "评论不存在" },
        { status: 404 }
      );
    }
    
    // 删除评论
    await prisma.comment.delete({
      where: { id: commentId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除评论失败:", error);
    return NextResponse.json(
      { error: "删除评论失败，请稍后再试" },
      { status: 500 }
    );
  }
} 