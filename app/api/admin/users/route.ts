import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
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
  for (const userRole of user.userRoles) {
    if (userRole.role.permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasViewPermission = await checkPermission(session, Permission.VIEW_USERS);
    
    if (!hasViewPermission) {
      return NextResponse.json(
        { error: "没有权限查看用户列表" },
        { status: 403 }
      );
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // 角色过滤
    if (roleFilter) {
      where.userRoles = {
        some: {
          role: {
            name: roleFilter
          }
        }
      };
    }
    
    // 计算总数
    const total = await prisma.user.count({ where });
    
    // 获取用户列表
    const users = await prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // 格式化响应数据
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isActive: user.isActive,
      status: user.status,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })),
      createdAt: user.createdAt
    }));
    
    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json(
      { error: "获取用户列表失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await getServerSession(authOptions) as ExtendedSession;
    const hasCreatePermission = await checkPermission(session, Permission.CREATE_USER);
    
    if (!hasCreatePermission) {
      return NextResponse.json(
        { error: "没有权限创建用户" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name, email, password, roles, status, isActive } = body;
    
    // 验证请求数据
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "缺少必要的用户信息" },
        { status: 400 }
      );
    }
    
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 400 }
      );
    }
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // 注意：实际应用中应对密码进行哈希处理
        status: status || "approved",
        isActive: isActive !== undefined ? isActive : true,
      }
    });
    
    // 如果提供了角色，分配角色
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const roleId of roles) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId
          }
        });
      }
    }
    
    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user!.id,
        action: "CREATE_USER",
        resource: "USER",
        resourceId: user.id,
        details: { name, email, status, isActive }
      }
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("创建用户失败:", error);
    return NextResponse.json(
      { error: "创建用户失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 