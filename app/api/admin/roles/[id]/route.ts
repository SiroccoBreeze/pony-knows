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

// 检查用户是否有指定权限
async function checkPermission(session: ExtendedSession | null, permission: string): Promise<boolean> {
  if (!session?.user?.id) return false;
  
  // 如果 session 中已有角色和权限信息
  if (session.user.roles) {
    const permissions: string[] = [];
    session.user.roles.forEach(role => {
      if (role.role.permissions) {
        permissions.push(...role.role.permissions);
      }
    });
    return permissions.includes(permission);
  }
  
  // 否则从数据库查询
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });
  
  if (!user) return false;
  
  // 检查用户的角色是否有指定权限
  for (const userRole of user.userRoles || []) {
    if (userRole.role.permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

// 获取单个角色详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasViewPermission = await checkPermission(session, Permission.VIEW_ROLES);
    
    if (!hasViewPermission) {
      return NextResponse.json(
        { error: "没有权限查看角色详情" },
        { status: 403 }
      );
    }
    
    const roleId = params.id;
    
    // 获取角色及其关联的用户数量
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });
    
    if (!role) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 格式化返回数据
    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
    
    return NextResponse.json(formattedRole);
  } catch (error) {
    console.error("获取角色详情失败:", error);
    return NextResponse.json(
      { error: "获取角色详情失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 更新角色
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasEditPermission = await checkPermission(session, Permission.EDIT_ROLE);
    
    if (!hasEditPermission) {
      return NextResponse.json(
        { error: "没有权限编辑角色" },
        { status: 403 }
      );
    }
    
    const roleId = params.id;
    const { name, description, permissions } = await request.json();
    
    // 验证必要字段
    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "缺少必要的角色信息" },
        { status: 400 }
      );
    }
    
    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId }
    });
    
    if (!existingRole) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 检查角色名是否被其他角色使用
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name,
          id: { not: roleId }
        }
      });
      
      if (nameExists) {
        return NextResponse.json(
          { error: "角色名已被使用" },
          { status: 400 }
        );
      }
    }
    
    // 更新角色
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        description,
        permissions
      }
    });
    
    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user!.id,
        action: "UPDATE_ROLE",
        resource: "ROLE",
        resourceId: roleId,
        details: { 
          name, 
          permissionCount: permissions.length,
          previousName: existingRole.name,
          previousPermissionCount: existingRole.permissions.length
        }
      }
    });
    
    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("更新角色失败:", error);
    return NextResponse.json(
      { error: "更新角色失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 删除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasDeletePermission = await checkPermission(session, Permission.DELETE_ROLE);
    
    if (!hasDeletePermission) {
      return NextResponse.json(
        { error: "没有权限删除角色" },
        { status: 403 }
      );
    }
    
    const roleId = params.id;
    
    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });
    
    if (!existingRole) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }
    
    // 检查是否有用户正在使用此角色
    if (existingRole._count.users > 0) {
      return NextResponse.json(
        { error: "无法删除正在使用的角色，请先移除该角色下的所有用户" },
        { status: 400 }
      );
    }
    
    // 删除角色
    await prisma.role.delete({
      where: { id: roleId }
    });
    
    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user!.id,
        action: "DELETE_ROLE",
        resource: "ROLE",
        resourceId: roleId,
        details: { 
          name: existingRole.name,
          permissionCount: existingRole.permissions.length
        }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除角色失败:", error);
    return NextResponse.json(
      { error: "删除角色失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 