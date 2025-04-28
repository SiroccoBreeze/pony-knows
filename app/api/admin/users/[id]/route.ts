import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Permission } from "@/lib/permissions";

const prisma = new PrismaClient();

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

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查用户是否有编辑用户的权限
    const userPermissions: string[] = [];
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    const canEditUsers = userPermissions.includes(Permission.EDIT_USER);
    
    if (!canEditUsers && !isSuperAdmin) {
      return NextResponse.json(
        { error: "没有权限编辑用户" },
        { status: 403 }
      );
    }

    // 确保params已解析
    const paramsData = await params;
    const userId = paramsData.id;
    
    const requestData = await request.json();
    const { name, email, isActive, status, roles } = requestData;

    console.log("接收到的用户数据:", { userId, name, email, isActive, status, roles });

    // 检查用户是否存在
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 更新用户基本信息
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        // 确保明确设置 isActive，即使为 false
        isActive: isActive === true || isActive === false ? isActive : userExists.isActive,
        // 添加审核状态字段
        status: status || userExists.status,
      },
    });

    // 如果提供了角色信息，更新用户角色
    if (roles && Array.isArray(roles)) {
      // 删除现有角色关联
      await prisma.userRole.deleteMany({
        where: { userId },
      });

      // 创建新的角色关联
      for (const roleId of roles) {
        await prisma.userRole.create({
          data: {
            userId,
            roleId,
          },
        });
      }
    }

    // 获取更新后的完整用户信息（包括角色）
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 记录管理员操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER",
        resource: "USER",
        resourceId: userId,
        details: { updatedFields: { name, email, isActive, status, roles } },
      },
    });

    return NextResponse.json(userWithRoles);
  } catch (error) {
    console.error("更新用户失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "更新用户失败", details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH方法调用PUT方法
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return PUT(request, context);
}

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }

    // 检查用户是否有查看用户的权限
    const userPermissions: string[] = [];
    if (session.user.roles) {
      session.user.roles.forEach(role => {
        if (role.role.permissions) {
          userPermissions.push(...role.role.permissions);
        }
      });
    }

    const isSuperAdmin = session.user.roles?.some(role => role.role.name === "超级管理员");
    const canViewUsers = userPermissions.includes(Permission.VIEW_USERS);
    
    // 确保params已解析
    const paramsData = await params;
    
    // 只允许查看自己或有权限的用户可以查看其他用户
    const isOwnProfile = paramsData.id === session.user.id;
    if (!isOwnProfile && !canViewUsers && !isSuperAdmin) {
      return NextResponse.json(
        { error: "没有权限查看此用户" },
        { status: 403 }
      );
    }

    const userId = paramsData.id;

    // 获取用户信息（包括角色）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("获取用户失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "获取用户失败", details: errorMessage },
      { status: 500 }
    );
  }
} 