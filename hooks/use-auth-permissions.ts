"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback, useRef } from "react"
import { 
  AdminPermission, 
  UserPermission, 
  Permission
} from "@/lib/permissions"

interface ApiDebugResponse {
  authenticated?: boolean;
  permissions?: string[];
  hasAdminAccess?: boolean;
  error?: string;
}

// 增加全局缓存，跨组件共享权限数据
let globalPermissionsCache: string[] | null = null;
let globalCacheTimestamp: number = 0;
const GLOBAL_CACHE_DURATION = 5000; // 降低全局缓存时间为5秒有效

// 添加一个重置全局缓存的函数
export function resetGlobalPermissionsCache() {
  console.log("重置全局权限缓存");
  globalPermissionsCache = null;
  globalCacheTimestamp = 0;
  
  // 同时清除本地存储
  localStorage.removeItem('cached_permissions');
  localStorage.removeItem('cached_permissions_timestamp');
}

export function useAuthPermissions() {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const permissionsInitialized = useRef(false)
  const apiCallCount = useRef(0)
  const lastRefreshTime = useRef<number>(0)

  // 从服务器获取最新权限 - 增强缓存机制
  const fetchServerPermissions = useCallback(async (forceRefresh = false): Promise<string[]> => {
    // 强制刷新时清除所有缓存
    if (forceRefresh) {
      resetGlobalPermissionsCache();
      lastRefreshTime.current = Date.now();
    }
    
    // 使用全局缓存（如果有效且未强制刷新）
    const now = Date.now();
    if (
      !forceRefresh && 
      globalPermissionsCache && 
      (now - globalCacheTimestamp) < GLOBAL_CACHE_DURATION &&
      (now - lastRefreshTime.current) > 60000 // 一分钟内强制刷新过则不使用缓存
    ) {
      console.log('使用全局缓存的权限数据');
      return globalPermissionsCache;
    }
    
    // 使用本地存储缓存
    const CACHE_DURATION = 5000; // 降低缓存时间为5秒
    
    try {
      // 如果未强制刷新、缓存有效、且一分钟内未强制刷新过，使用缓存权限
      if (
        !forceRefresh && 
        (now - lastRefreshTime.current) > 60000
      ) {
        const cachedPermissionsData = localStorage.getItem('cached_permissions');
        const cachedTimestamp = localStorage.getItem('cached_permissions_timestamp');
        
        if (
          cachedPermissionsData && 
          cachedTimestamp && 
          (now - parseInt(cachedTimestamp)) < CACHE_DURATION
        ) {
          const parsedPermissions = JSON.parse(cachedPermissionsData);
          // 更新全局缓存
          globalPermissionsCache = parsedPermissions;
          globalCacheTimestamp = now;
          console.log('使用本地存储缓存的权限数据');
          return parsedPermissions;
        }
      }
      
      // 记录API调用
      apiCallCount.current += 1;
      if (apiCallCount.current > 3) {
        console.warn(`权限API调用次数过多(${apiCallCount.current})，可能存在循环调用问题`);
      }
      
      // 缓存失效或强制刷新，从服务器获取
      setIsSyncing(true);
      console.log('从服务器获取最新权限数据');
      
      // 构建随机参数以避免浏览器缓存
      const randomParam = `_nocache=${Date.now()}_${Math.random()}`;
      const response = await fetch(`/api/auth/debug?${randomParam}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true',
          'X-Timestamp': now.toString()
        }
      });
      
      if (!response.ok) {
        console.error('权限API响应错误:', response.status);
        return [];
      }
      
      const data: ApiDebugResponse = await response.json();
      
      if (data.authenticated && data.permissions) {
        console.log('从服务器获取的权限:', data.permissions);
        
        // 更新缓存
        localStorage.setItem('cached_permissions', JSON.stringify(data.permissions));
        localStorage.setItem('cached_permissions_timestamp', now.toString());
        
        // 更新全局缓存
        globalPermissionsCache = data.permissions;
        globalCacheTimestamp = now;
        
        return data.permissions;
      }
      
      return [];
    } catch (error) {
      console.error('获取服务器权限失败:', error);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [])

  // 初始化权限
  useEffect(() => {
    let mounted = true;
    
    async function initPermissions() {
      // 防止重复初始化
      if (permissionsInitialized.current) return;
      
      if (status === "loading") {
        // 会话正在加载，保持加载状态
        if (mounted) setIsLoading(true);
        return;
      }
      
      if (status === "authenticated" && session?.user) {
        try {
          // 清除全局缓存，确保获取最新权限
          resetGlobalPermissionsCache();
          
          // 从服务器获取最新权限
          console.log("初始化权限 - 从服务器获取最新数据");
          const serverPermissions = await fetchServerPermissions(true);
          
          if (mounted) {
            setPermissions([...new Set(serverPermissions)]);
            setIsLoading(false);
            permissionsInitialized.current = true;
            console.log("权限初始化完成:", serverPermissions);
          }
        } catch (error) {
          console.error('服务器权限获取失败:', error);
          
          // 完全失败时设置空权限并完成加载
          if (mounted) {
            setPermissions([]);
            setIsLoading(false);
            permissionsInitialized.current = true;
          }
        }
      } else if (status === "unauthenticated") {
        // 未登录，设置空权限并完成加载
        if (mounted) {
          setPermissions([]);
          setIsLoading(false);
          permissionsInitialized.current = true;
        }
      }
    }
    
    initPermissions();
    
    return () => {
      mounted = false;
    }
  }, [session, status, fetchServerPermissions])

  // 检查是否具有指定权限
  const hasPermission = useCallback((permission: string | Permission | AdminPermission | UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查权限数组是否包含指定权限
    return permissions.includes(permission as string);
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有任意一个指定权限
  const hasAnyPermission = useCallback((requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查是否有任一权限匹配
    return requiredPermissions.some(perm => permissions.includes(perm as string));
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有所有指定权限
  const hasAllPermissions = useCallback((requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查是否所有权限都匹配
    return requiredPermissions.every(perm => permissions.includes(perm as string));
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有管理员权限
  const hasAdminPermission = useCallback((permission: AdminPermission): boolean => {
    if (isLoading || isSyncing) return false;
    return permissions.includes(permission);
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有用户端权限
  const hasUserPermission = useCallback((permission: UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 直接使用字符串形式比较权限，确保匹配
    return permissions.includes(permission);
  }, [isLoading, isSyncing, permissions]);

  // 检查是否为管理员
  const isAdmin = useCallback((): boolean => {
    return hasAdminPermission(AdminPermission.ADMIN_ACCESS);
  }, [hasAdminPermission]);

  // 强制刷新权限
  const refreshPermissions = useCallback(async (): Promise<void> => {
    // 设置最后刷新时间
    lastRefreshTime.current = Date.now();
    
    // 清除所有缓存
    resetGlobalPermissionsCache();
    
    // 设置加载状态
    setIsLoading(true);
    
    try {
      // 从服务器获取最新权限
      const freshPermissions = await fetchServerPermissions(true);
      setPermissions([...new Set(freshPermissions)]);
      console.log("权限强制刷新完成:", freshPermissions);
    } catch (error) {
      console.error("权限刷新失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchServerPermissions]);

  return {
    isLoading,
    isSyncing,
    isAuthenticated: status === "authenticated",
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasAdminPermission,
    hasUserPermission,
    isAdmin,
    refreshPermissions
  }
} 