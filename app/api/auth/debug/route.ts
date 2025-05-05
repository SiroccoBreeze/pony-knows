import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { AdminPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// 定义缓存数据的类型
interface CachedData {
  data: Record<string, unknown>;
  timestamp: number;
}

// 创建一个服务器端缓存对象
const API_CACHE = new Map<string, CachedData>();

export async function GET(request: Request) {
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
    
    // 检查请求头
    const headers = new Headers(request.headers);
    const isForceRefresh = headers.get('X-Force-Refresh') === 'true';
    const timestamp = headers.get('X-Timestamp') || Date.now().toString();

    console.log(`[API] 权限请求 - 用户:${userId}, 强制刷新:${isForceRefresh}, 时间戳:${timestamp}`);
    
    // 总是清除用户缓存，确保每次都从数据库获取最新数据
    const cacheKey = `auth_debug_${userId}`;
    API_CACHE.delete(cacheKey);
    
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
    
    if (!userData) {
      console.error(`[API] 找不到用户数据, 用户ID: ${userId}`);
      return NextResponse.json(
        { error: "找不到用户数据", authenticated: false },
        { status: 404 }
      );
    }
    
    // 提取所有权限到一个数组
    const permissions: string[] = [];
    userData.userRoles.forEach(userRole => {
      if (userRole.role.permissions) {
        permissions.push(...userRole.role.permissions);
      }
    });
    
    // 检查是否有管理员权限
    const hasAdminAccess = permissions.includes(AdminPermission.ADMIN_ACCESS);
    
    // 准备返回数据
    const responseData = {
      authenticated: true,
      sessionUserId: userId,
      dbUser: {
        id: userData.id,
        email: userData.email,
        name: userData.name
      },
      roles: userData.userRoles.map(ur => ({
        roleName: ur.role.name,
        permissions: ur.role.permissions
      })),
      permissions: [...new Set(permissions)],
      hasAdminAccess,
      refreshedAt: new Date().toISOString(),
      isForceRefresh,
      queryTimestamp: timestamp
    };
    
    console.log(`[API] 权限刷新完成 - 用户:${userId}, 权限数量:${permissions.length}`);
    
    // 更新缓存
    API_CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // 返回调试信息，并设置响应头阻止缓存
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error("权限调试API错误:", error);
    return NextResponse.json(
      { error: "服务器错误", message: String(error) },
      { status: 500 }
    );
  }
} 