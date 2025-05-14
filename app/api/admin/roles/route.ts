import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { AdminPermission } from "@/lib/permissions";

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
    permissions?: string[];
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
    
    // 管理员自动拥有所有权限
    if (permissions.includes(AdminPermission.ADMIN_ACCESS)) {
      console.log(`[权限检查] 用户拥有管理员权限`);
      return true;
    }
    
    // 或者直接检查session中的permissions
    if (session.user.permissions && session.user.permissions.includes(AdminPermission.ADMIN_ACCESS)) {
      console.log(`[权限检查] 用户拥有管理员权限(来自session.permissions)`);
      return true;
    }
    
    return permissions.includes(permission);
  }
  
  // 直接检查session.user.permissions
  if (session.user.permissions) {
    if (session.user.permissions.includes(AdminPermission.ADMIN_ACCESS)) {
      console.log(`[权限检查] 用户拥有管理员权限(来自session.permissions)`);
      return true;
    }
    
    return session.user.permissions.includes(permission);
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
    // 管理员自动拥有所有权限
    if (userRole.role.permissions.includes(AdminPermission.ADMIN_ACCESS)) {
      return true;
    }
    
    if (userRole.role.permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

// 获取所有角色
export async function GET(request: NextRequest) {
  try {
    // 权限检查 - 使用管理员权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasViewPermission = await checkPermission(session, AdminPermission.ADMIN_ACCESS);
    
    if (!hasViewPermission) {
      return NextResponse.json(
        { error: "没有权限查看角色列表" },
        { status: 403 }
      );
    }
    
    // 获取所有角色
    const roles = await prisma.role.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });
    
    // 格式化响应数据
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      userCount: role._count.users,
      createdAt: role.createdAt
    }));
    
    return NextResponse.json({ roles: formattedRoles });
  } catch (error) {
    console.error("获取角色列表失败:", error);
    return NextResponse.json(
      { error: "获取角色列表失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 创建角色
export async function POST(request: NextRequest) {
  try {
    // 权限检查 - 使用管理员权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasCreatePermission = await checkPermission(session, AdminPermission.ADMIN_ACCESS);
    
    if (!hasCreatePermission) {
      return NextResponse.json(
        { error: "没有权限创建角色" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name, description, permissions } = body;
    
    // 验证请求数据
    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "缺少必要的角色信息" },
        { status: 400 }
      );
    }
    
    // 检查角色名是否已存在
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });
    
    if (existingRole) {
      return NextResponse.json(
        { error: "该角色名已存在" },
        { status: 400 }
      );
    }
    
    // 创建角色
    const role = await prisma.role.create({
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
        action: "CREATE_ROLE",
        resource: "ROLE",
        resourceId: role.id,
        details: { name, permissionCount: permissions.length }
      }
    });
    
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("创建角色失败:", error);
    return NextResponse.json(
      { error: "创建角色失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 