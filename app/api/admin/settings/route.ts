import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { AdminPermission } from "@/lib/permissions";
import { clearParametersCache } from "@/lib/system-parameters";

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

// 检查用户是否有管理员权限
async function checkAdminPermission(session: ExtendedSession | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  
  // 如果 session 中已有角色和权限信息
  if (session.user.roles) {
    const permissions: string[] = [];
    session.user.roles.forEach(role => {
      if (role.role.permissions) {
        permissions.push(...role.role.permissions);
      }
    });
    return permissions.includes(AdminPermission.ADMIN_ACCESS);
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
  
  // 检查用户的角色是否有管理员权限
  for (const userRole of user.userRoles || []) {
    if (userRole.role.permissions.includes(AdminPermission.ADMIN_ACCESS)) {
      return true;
    }
  }
  
  return false;
}

// 获取系统设置
export async function GET() {
  try {
    // 权限检查 - 只需要管理员权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    const isAdmin = await checkAdminPermission(session);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "没有权限查看系统设置" },
        { status: 403 }
      );
    }
    
    const settings = await prisma.systemSetting.findMany({
      orderBy: [
        { group: 'asc' },
        { key: 'asc' }
      ]
    });
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("获取系统设置失败:", error);
    return NextResponse.json(
      { error: "获取系统设置失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 更新系统设置
export async function PUT(request: NextRequest) {
  try {
    // 权限检查 - 只需要管理员权限
    const session = await getServerSession(authOptions) as ExtendedSession;
    const isAdmin = await checkAdminPermission(session);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "没有权限修改系统设置" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { settings } = body;
    
    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: "无效的设置数据" },
        { status: 400 }
      );
    }
    
    // 批量更新设置
    const updatePromises = settings.map(async (setting) => {
      return prisma.systemSetting.update({
        where: { id: setting.id },
        data: { value: setting.value }
      });
    });
    
    await Promise.all(updatePromises);
    
    // 清除参数缓存，确保系统能立即使用新参数值
    clearParametersCache();
    
    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        userId: session.user!.id,
        action: "UPDATE_SETTINGS",
        resource: "SYSTEM_SETTINGS",
        details: { count: settings.length }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新系统设置失败:", error);
    return NextResponse.json(
      { error: "更新系统设置失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 