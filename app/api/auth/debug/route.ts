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

// 创建一个服务器端缓存，避免频繁查询数据库
const API_CACHE = new Map<string, CachedData>();
const CACHE_DURATION = 15000; // 15秒缓存有效期

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
    
    // 检查缓存，除非是强制刷新请求
    const cacheKey = `auth_debug_${userId}`;
    if (!isForceRefresh && API_CACHE.has(cacheKey)) {
      const cached = API_CACHE.get(cacheKey);
      if ((Date.now() - cached!.timestamp) < CACHE_DURATION) {
        // 使用缓存数据
        console.log(`[API] 使用缓存数据，用户 ${userId}`);
        return NextResponse.json(cached!.data);
      }
    }
    
    if (isForceRefresh) {
      console.log(`[API] 强制刷新权限数据，用户 ${userId}`);
      // 清除缓存
      API_CACHE.delete(cacheKey);
    }
    
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
    const hasAdminAccess = permissions.includes(AdminPermission.ADMIN_ACCESS);
    
    // 准备返回数据
    const responseData = {
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
      hasAdminAccess,
      refreshedAt: new Date().toISOString(),
      isForceRefresh
    };
    
    // 更新缓存
    API_CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // 返回调试信息
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': isForceRefresh ? 'no-store' : 'private, max-age=15',
        'Expires': isForceRefresh ? '0' : new Date(Date.now() + 15000).toUTCString()
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