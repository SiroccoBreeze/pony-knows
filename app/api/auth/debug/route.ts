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
    
    // 如果没有会话，返回未授权状态但包含空的权限数组
    if (!session) {
      console.log(`[API] 权限请求 - 未登录用户`);
      return NextResponse.json(
        { 
          authenticated: false,
          permissions: [],
          roles: [],
          hasAdminAccess: false,
          refreshedAt: new Date().toISOString(),
          message: "未登录用户，无需加载权限"
        },
        { 
          status: 200, // 返回200而非401，避免客户端报错
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }
    
    // 从会话中获取用户ID
    const userId = session.user?.id;
    
    // 检查请求头
    const headers = new Headers(request.headers);
    const isForceRefresh = headers.get('X-Force-Refresh') === 'true';
    const timestamp = headers.get('X-Timestamp') || Date.now().toString();

    console.log(`[API] 权限请求 - 用户:${userId}, 强制刷新:${isForceRefresh}, 时间戳:${timestamp}`);
    
    // 检查缓存
    const cacheKey = `auth_debug_${userId}`;
    if (!isForceRefresh && API_CACHE.has(cacheKey)) {
      const cachedData = API_CACHE.get(cacheKey);
      if (cachedData && (Date.now() - cachedData.timestamp) < 30000) { // 30秒缓存
        console.log(`[API] 权限请求 - 使用缓存数据: ${userId}`);
        return NextResponse.json(cachedData.data);
      }
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
    
    if (!userData) {
      console.error(`[API] 找不到用户数据, 用户ID: ${userId}`);
      return NextResponse.json(
        { 
          authenticated: false,
          permissions: [],
          roles: [],
          hasAdminAccess: false,
          error: "找不到用户数据"
        },
        { status: 200 }
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
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error("权限调试API错误:", error);
    return NextResponse.json(
      { 
        error: "服务器错误", 
        message: String(error),
        authenticated: false,
        permissions: [] 
      },
      { 
        status: 200, // 返回200状态码，以避免客户端500错误
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 