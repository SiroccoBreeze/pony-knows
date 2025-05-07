import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prisma";

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

// 获取系统参数值
export async function getSystemParameter(key: string): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true }
    });
    
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`获取系统参数 ${key} 失败:`, error);
    return null;
  }
}

// 检查用户是否为管理员
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      if (userRole.role.permissions.includes("admin_access")) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("检查用户管理员权限失败:", error);
    return false;
  }
}

// 维护模式中间件
export async function maintenanceMiddleware(req: NextRequest) {
  try {
    // 获取维护模式状态
    const maintenanceMode = await getSystemParameter("maintenance_mode");
    
    // 如果不在维护模式，直接放行
    if (maintenanceMode !== "true") {
      return NextResponse.next();
    }
    
    // 检查用户是否为管理员
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (session?.user?.id) {
      const isAdmin = await isUserAdmin(session.user.id);
      if (isAdmin) {
        // 管理员可以访问
        return NextResponse.next();
      }
    }
    
    // 非管理员用户在维护模式下重定向到维护页面
    return NextResponse.redirect(new URL("/maintenance", req.url));
  } catch (error) {
    console.error("维护模式中间件错误:", error);
    // 发生错误时继续访问，避免完全阻止网站访问
    return NextResponse.next();
  }
}

// 评论功能检查中间件
export async function commentsEnabledMiddleware(req: NextRequest) {
  try {
    // 只拦截评论相关API
    if (!req.url.includes("/api/comments")) {
      return NextResponse.next();
    }
    
    // 获取评论功能状态
    const commentsEnabled = await getSystemParameter("enable_comments");
    
    // 如果评论功能已启用，直接放行
    if (commentsEnabled === "true") {
      return NextResponse.next();
    }
    
    // 检查用户是否为管理员
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (session?.user?.id) {
      const isAdmin = await isUserAdmin(session.user.id);
      if (isAdmin) {
        // 管理员可以继续操作
        return NextResponse.next();
      }
    }
    
    // 评论功能已关闭
    return NextResponse.json(
      { error: "评论功能已关闭" },
      { status: 403 }
    );
  } catch (error) {
    console.error("评论功能中间件错误:", error);
    // 发生错误时继续访问
    return NextResponse.next();
  }
}

// 注册功能检查中间件
export async function registrationEnabledMiddleware(req: NextRequest) {
  try {
    // 只拦截注册API
    if (!req.url.includes("/api/auth/register") && !req.url.includes("/api/register")) {
      return NextResponse.next();
    }
    
    // 获取注册功能状态
    const registrationEnabled = await getSystemParameter("enable_registration");
    
    // 如果注册功能已启用，直接放行
    if (registrationEnabled === "true") {
      return NextResponse.next();
    }
    
    // 注册功能已关闭
    return NextResponse.json(
      { error: "注册功能已关闭" },
      { status: 403 }
    );
  } catch (error) {
    console.error("注册功能中间件错误:", error);
    // 发生错误时继续访问
    return NextResponse.next();
  }
} 