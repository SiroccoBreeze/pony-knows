import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prisma";
import { AdminPermission } from "@/lib/permissions";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: {
      role: {
        name: string;
        permissions: string[];
      }
    }[];
  };
}

// 检查用户权限
export async function GET(
  request: Request,
  { params }: { params: { id: string | Promise<{ id: string }> } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 正确处理params - 先await整个params对象
    const paramsData = await Promise.resolve(params);
    // 如果id是Promise，则await它
    const id = typeof paramsData.id === 'string' 
      ? paramsData.id 
      : (await paramsData.id).id;

    // 检查帖子是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 获取用户权限
    const userPermissions: string[] = [];
    
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    // 特殊处理：超级管理员总是可以编辑
    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    
    // 检查权限：用户必须是帖子作者或拥有编辑帖子权限或是超级管理员
    const isAuthor = existingPost.authorId === session.user.id;
    const isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
    const canEditPosts = userPermissions.includes(AdminPermission.ADMIN_ACCESS);

    // 权限检查
    if (!isAuthor && !canEditPosts && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: "您没有权限编辑此帖子，只有帖子作者或管理员可以执行此操作" },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      success: true,
      isAuthor,
      isAdmin,
      isSuperAdmin
    });
  } catch (error) {
    console.error("权限检查失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "权限检查失败，请稍后再试", details: errorMessage },
      { status: 500 }
    );
  }
} 