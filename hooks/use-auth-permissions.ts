"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback, useRef } from "react"
import { 
  AdminPermission, 
  UserPermission
} from "@/lib/permissions"

interface ApiDebugResponse {
  authenticated?: boolean;
  permissions?: string[];
  hasAdminAccess?: boolean;
  error?: string;
}

// 增加更高效的全局缓存，跨组件共享权限数据
let globalPermissionsCache: string[] | null = null;
let globalCacheTimestamp: number = 0;
const GLOBAL_CACHE_DURATION = 5000; // 增加全局缓存时间为5秒有效，减少请求频率
let pendingRequest: Promise<string[]> | null = null; // 用于防止并发请求

// 防抖函数
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

// 添加一个重置全局缓存的函数
export function resetGlobalPermissionsCache() {
  console.log("重置全局权限缓存");
  globalPermissionsCache = null;
  globalCacheTimestamp = 0;
  pendingRequest = null;
  
  // 同时清除本地存储
  localStorage.removeItem('cached_permissions');
  localStorage.removeItem('cached_permissions_timestamp');
}

export function useAuthPermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const permissionsInitialized = useRef(false);
  const apiCallCount = useRef(0);
  const lastRefreshTime = useRef<number>(0);
  const userId = useRef<string | null>(null);

  // 监听用户ID变化
  useEffect(() => {
    // 如果用户ID变了，清除缓存
    const currentUserId = session?.user?.id;
    if (currentUserId && userId.current && currentUserId !== userId.current) {
      resetGlobalPermissionsCache();
    }
    userId.current = currentUserId || null;
  }, [session?.user?.id]);

  // 从服务器获取最新权限 - 增强缓存与并发控制
  const fetchServerPermissions = useCallback(async (forceRefresh = false): Promise<string[]> => {
    // 如果已有权限且非强制刷新，直接返回
    if (!forceRefresh && permissions.length > 0) {
      return permissions;
    }
    
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
      (now - globalCacheTimestamp) < GLOBAL_CACHE_DURATION
    ) {
      console.log('使用全局缓存的权限数据');
      return globalPermissionsCache;
    }
    
    // 如果有其他组件正在请求，复用同一个Promise
    if (pendingRequest) {
      console.log('使用其他组件已发起的权限请求');
      return pendingRequest;
    }
    
    // 使用本地存储缓存
    const CACHE_DURATION = 5000; // 提高缓存时间为5秒
    
    try {
      // 如果未强制刷新且缓存有效，使用缓存权限
      if (!forceRefresh) {
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
        
        // 如果调用过于频繁，返回最后一次的权限结果或空数组，而不是继续请求
        if (globalPermissionsCache) {
          return globalPermissionsCache;
        }
        
        const cachedPermissionsData = localStorage.getItem('cached_permissions');
        if (cachedPermissionsData) {
          return JSON.parse(cachedPermissionsData);
        }
        
        return [];
      }
      
      // 缓存失效或强制刷新，从服务器获取
      setIsSyncing(true);
      console.log('从服务器获取最新权限数据');
      
      // 创建请求Promise并存储在全局变量中
      pendingRequest = (async () => {
        try {
          // 构建随机参数以避免浏览器缓存
          const randomParam = `_nocache=${Date.now()}_${Math.random()}`;
          const response = await fetch(`/api/auth/debug?${randomParam}`, {
            cache: 'no-store',
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Force-Refresh': forceRefresh ? 'true' : 'false',
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
        } finally {
          // 请求完成后清除pendingRequest
          pendingRequest = null;
          setIsSyncing(false);
        }
      })();
      
      return await pendingRequest;
    } catch (error) {
      console.error('获取服务器权限失败:', error);
      pendingRequest = null;
      return [];
    }
  }, [permissions]);

  // 初始化权限，并使用防抖
  const debouncedFetchPermissions = useCallback(
    debounce(async () => {
      // 防止重复初始化
      if (permissionsInitialized.current) return;
      
      if (status === "loading") {
        // 会话正在加载，保持加载状态
        setIsLoading(true);
        return;
      }
      
      if (status === "authenticated" && session?.user) {
        try {
          // 从服务器获取最新权限
          console.log("初始化权限 - 从服务器获取最新数据");
          const serverPermissions = await fetchServerPermissions(false); // 避免强制刷新
          
          setPermissions([...new Set(serverPermissions)]);
          setIsLoading(false);
          permissionsInitialized.current = true;
          console.log("权限初始化完成:", serverPermissions);
        } catch (error) {
          console.error('服务器权限获取失败:', error);
          
          // 完全失败时设置空权限并完成加载
          setPermissions([]);
          setIsLoading(false);
          permissionsInitialized.current = true;
        }
      } else if (status === "unauthenticated") {
        // 未登录，设置空权限并完成加载
        setPermissions([]);
        setIsLoading(false);
        permissionsInitialized.current = true;
      }
    }, 100),
    [session, status, fetchServerPermissions]
  );

  // 初始化权限
  useEffect(() => {
    // 只在未初始化且会话状态确定时执行
    if (!permissionsInitialized.current && status !== "loading") {
      debouncedFetchPermissions();
    }
    
    return () => {
      // 组件卸载时的清理工作
    };
  }, [status, debouncedFetchPermissions]);

  // 检查是否具有指定权限
  const hasPermission = useCallback((permission: string | AdminPermission | UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查权限数组是否包含指定权限
    return permissions.includes(permission as string);
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有任意一个指定权限
  const hasAnyPermission = useCallback((requiredPermissions: (string | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查是否有任一权限匹配
    return requiredPermissions.some(perm => permissions.includes(perm as string));
  }, [isLoading, isSyncing, permissions]);

  // 检查是否具有所有指定权限
  const hasAllPermissions = useCallback((requiredPermissions: (string | AdminPermission | UserPermission)[]): boolean => {
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

  // 强制刷新权限 - 使用防抖避免频繁调用
  const refreshPermissions = useCallback(
    debounce(async (): Promise<void> => {
      // 设置最后刷新时间
      lastRefreshTime.current = Date.now();
      
      // 清除所有缓存并强制获取新权限
      try {
        const newPermissions = await fetchServerPermissions(true);
        setPermissions([...new Set(newPermissions)]);
      } catch (error) {
        console.error('刷新权限失败:', error);
      }
    }, 300),
    [fetchServerPermissions]
  );

  return {
    permissions,
    isLoading,
    isSyncing,
    isAuthenticated: status === "authenticated",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasAdminPermission,
    hasUserPermission,
    isAdmin,
    refreshPermissions
  };
} 