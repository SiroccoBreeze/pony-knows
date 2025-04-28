import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 获取服务端会话
    const session = await getServerSession(authOptions);
    
    // 如果没有会话，返回未授权状态
    if (!session) {
      return NextResponse.json(
        { error: "未授权访问", authenticated: false },
        { status: 401 }
      );
    }
    
    // 从会话中获取用户ID
    const userId = session.user?.id;
    
    // 直接从数据库查询用户的角色和权限
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    // 提取所有权限到一个数组
    const permissions: string[] = [];
    userData?.userRoles.forEach(userRole => {
      if (userRole.role.permissions) {
        permissions.push(...userRole.role.permissions);
      }
    });
    
    // 检查是否有管理员权限
    const hasAdminAccess = permissions.includes(Permission.ADMIN_ACCESS);
    
    // 返回调试信息
    return NextResponse.json({
      authenticated: true,
      sessionUserId: userId,
      dbUser: {
        id: userData?.id,
        email: userData?.email,
        name: userData?.name
      },
      roles: userData?.userRoles.map(ur => ({
        roleName: ur.role.name,
        permissions: ur.role.permissions
      })),
      permissions: [...new Set(permissions)],
      hasAdminAccess
    });
    
  } catch (error) {
    console.error("权限调试API错误:", error);
    return NextResponse.json(
      { error: "服务器错误", message: String(error) },
      { status: 500 }
    );
  }
} 