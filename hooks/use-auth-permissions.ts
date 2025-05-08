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
const GLOBAL_CACHE_DURATION = 60000; // 增加全局缓存时间为60秒，显著减少请求频率
let pendingRequest: Promise<string[]> | null = null; // 用于防止并发请求
let apiRequestsInCurrentSession = 0; // 全局计数器，记录整个会话中的API请求次数

// 使用深度比较函数，避免不必要的状态更新
function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

// 更智能的防抖函数，带有立即执行选项
function debounce(fn: (...args: unknown[]) => unknown, ms = 300, immediate = false) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: unknown, ...args: unknown[]) {
    const callNow = immediate && !timeoutId;
    const later = () => {
      timeoutId = null;
      if (!immediate) fn.apply(this, args);
    };
    
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(later, ms);
    
    if (callNow) fn.apply(this, args);
  };
}

// 添加一个重置全局缓存的函数
export function resetGlobalPermissionsCache() {
  // 检查上次重置时间，防止频繁重置
  const now = Date.now();
  const lastResetTime = localStorage.getItem('permission_cache_reset_timestamp');
  
  // 如果2秒内已经重置过，跳过本次重置
  if (lastResetTime && (now - parseInt(lastResetTime)) < 2000) {
    console.log("权限缓存重置太频繁，跳过本次重置");
    return;
  }
  
  // 记录本次重置时间
  localStorage.setItem('permission_cache_reset_timestamp', now.toString());
  
  console.log("重置全局权限缓存");
  globalPermissionsCache = null;
  globalCacheTimestamp = 0;
  pendingRequest = null;
  
  // 同时清除本地存储
  localStorage.removeItem('cached_permissions');
  localStorage.removeItem('cached_permissions_timestamp');
  
  // 重置API请求计数
  apiRequestsInCurrentSession = 0;
}

// 添加一个全局触发权限变化事件的函数
export function triggerPermissionsChanged(newPermissions: string[]) {
  console.log("主动触发权限变化事件:", newPermissions);
  globalPermissionsCache = newPermissions;
  globalCacheTimestamp = Date.now();
  
  // 更新localStorage缓存
  localStorage.setItem('cached_permissions', JSON.stringify(newPermissions));
  localStorage.setItem('cached_permissions_timestamp', Date.now().toString());
  
  // 触发全局事件
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permissions-changed', {
      detail: { permissions: newPermissions }
    }));
  }
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
  const permissionsRef = useRef<string[]>([]); // 添加ref以避免闭包问题

  // 同步ref和state
  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  // 监听用户ID变化
  useEffect(() => {
    // 如果用户ID变了，清除缓存
    const currentUserId = session?.user?.id;
    if (currentUserId && userId.current && currentUserId !== userId.current) {
      resetGlobalPermissionsCache();
      apiCallCount.current = 0; // 重置本地计数器
    }
    userId.current = currentUserId || null;
  }, [session?.user?.id]);

  // 从服务器获取最新权限 - 增强缓存与并发控制
  const fetchServerPermissions = useCallback(async (forceRefresh = false): Promise<string[]> => {
    // 使用缓存优先策略
    
    // 1. 先尝试使用本地state
    if (!forceRefresh && permissions.length > 0) {
      return permissions;
    }
    
    // 2. 尝试使用全局缓存
    const now = Date.now();
    if (
      !forceRefresh && 
      globalPermissionsCache && 
      globalPermissionsCache.length > 0 && 
      (now - globalCacheTimestamp) < GLOBAL_CACHE_DURATION
    ) {
      console.log('使用全局缓存的权限数据');
      return globalPermissionsCache;
    }
    
    // 3. 尝试使用localStorage缓存
    const CACHE_DURATION = 60000; // 扩展本地存储缓存为60秒
    if (!forceRefresh) {
      const cachedPermissionsData = localStorage.getItem('cached_permissions');
      const cachedTimestamp = localStorage.getItem('cached_permissions_timestamp');
      
      if (
        cachedPermissionsData && 
        cachedTimestamp && 
        (now - parseInt(cachedTimestamp)) < CACHE_DURATION
      ) {
        try {
          const parsedPermissions = JSON.parse(cachedPermissionsData);
          if (Array.isArray(parsedPermissions) && parsedPermissions.length > 0) {
            // 更新全局缓存
            globalPermissionsCache = parsedPermissions;
            globalCacheTimestamp = now;
            console.log('使用本地存储缓存的权限数据');
            return parsedPermissions;
          }
        } catch {
          // 忽略解析错误
          console.error('缓存数据解析错误');
        }
      }
    }
    
    // 4. 如果有其他组件正在请求，复用同一个Promise
    if (pendingRequest) {
      console.log('使用其他组件已发起的权限请求');
      return pendingRequest;
    }
    
    // 请求限制逻辑 - 防止过多API调用
    apiCallCount.current += 1;
    apiRequestsInCurrentSession += 1;
    
    // 全局和本地API调用次数都检查
    if (apiCallCount.current > 10 || apiRequestsInCurrentSession > 30) {
      console.warn(`权限API调用限制触发: 组件内(${apiCallCount.current}), 会话内(${apiRequestsInCurrentSession})`);
      
      // API调用过多，回退到任何可用的缓存
      if (globalPermissionsCache && globalPermissionsCache.length > 0) {
        return globalPermissionsCache;
      }
      
      try {
        const cachedPermissionsData = localStorage.getItem('cached_permissions');
        if (cachedPermissionsData) {
          const parsedPermissions = JSON.parse(cachedPermissionsData);
          if (Array.isArray(parsedPermissions)) {
            return parsedPermissions;
          }
        }
      } catch {
        // 忽略解析错误
      }
      
      // 如果真的没有任何缓存，则返回当前state或空数组
      return permissions.length > 0 ? permissions : [];
    }
    
    // 只有在确实需要时才发起API请求
    setIsSyncing(true);
    console.log('从服务器获取最新权限数据');
    
    // 创建请求Promise并存储在全局变量中
    pendingRequest = (async () => {
      try {
        // 添加缓存破坏参数
        const cacheBuster = `_t=${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const response = await fetch(`/api/auth/debug?${cacheBuster}`, {
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
          // 回退到现有缓存
          if (permissions.length > 0) return permissions;
          if (globalPermissionsCache) return globalPermissionsCache;
          return [];
        }
        
        const data: ApiDebugResponse = await response.json();
        
        if (data.authenticated && data.permissions) {
          console.log('从服务器获取的权限:', data.permissions);
          
          // 更新本地存储缓存
          localStorage.setItem('cached_permissions', JSON.stringify(data.permissions));
          localStorage.setItem('cached_permissions_timestamp', now.toString());
          
          // 更新全局缓存
          globalPermissionsCache = data.permissions;
          globalCacheTimestamp = now;
          
          return data.permissions;
        }
        
        return permissions.length > 0 ? permissions : [];
      } catch (error) {
        console.error('获取服务器权限失败:', error);
        
        // 出错时使用任何可用的缓存
        if (permissions.length > 0) return permissions;
        if (globalPermissionsCache) return globalPermissionsCache;
        
        return [];
      } finally {
        pendingRequest = null;
        setIsSyncing(false);
      }
    })();
    
    return await pendingRequest;
  }, [permissions]);

  // 优化的初始化权限函数，使用立即执行防抖
  const debouncedFetchPermissions = useCallback(
    debounce(async () => {
      // 已初始化，跳过
      if (permissionsInitialized.current) return;
      
      // 会话仍在加载
      if (status === "loading") {
        setIsLoading(true);
        return;
      }
      
      // 认证状态下初始化权限
      if (status === "authenticated" && session?.user) {
        try {
          console.log("初始化权限 - 获取权限数据");
          const serverPermissions = await fetchServerPermissions(false);
          
          // 使用深度比较避免不必要的状态更新
          if (!areArraysEqual(permissionsRef.current, serverPermissions)) {
            setPermissions([...new Set(serverPermissions)]);
            
            // 确保权限被存储到localStorage，便于全局访问
            localStorage.setItem('cached_permissions', JSON.stringify(serverPermissions));
            localStorage.setItem('cached_permissions_timestamp', Date.now().toString());
            console.log("权限数据已刷新并缓存");
            
            // 触发全局事件，通知权限初始化完成
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('permissions-initialized', {
                detail: { permissions: serverPermissions }
              }));
              console.log("权限初始化事件已触发");
              
              // 同时触发权限变化事件
              window.dispatchEvent(new CustomEvent('permissions-changed', {
                detail: { permissions: serverPermissions }
              }));
              console.log("权限变化事件已触发");
            }
          }
          
          setIsLoading(false);
          permissionsInitialized.current = true;
          console.log("权限初始化完成:", serverPermissions);
        } catch (error) {
          console.error('权限初始化失败:', error);
          setPermissions([]);
          setIsLoading(false);
          permissionsInitialized.current = true;
        }
      } else if (status === "unauthenticated") {
        // 未登录状态
        setPermissions([]);
        setIsLoading(false);
        permissionsInitialized.current = true;
      }
    }, 100, true), // 立即执行，减少权限加载延迟
    [status, session, fetchServerPermissions]
  );

  // 初始化权限 - 优化依赖项
  useEffect(() => {
    // 只在未初始化且会话状态明确时执行
    if (!permissionsInitialized.current && status !== "loading") {
      debouncedFetchPermissions();
    }
    
    // 清理函数
    return () => {
      // 组件卸载时重置API调用计数
      apiCallCount.current = 0;
    };
  }, [status, debouncedFetchPermissions]);

  // 高性能权限检查 - 使用ref而不是state防止不必要的重新渲染
  const hasPermission = useCallback((permission: string | AdminPermission | UserPermission): boolean => {
    // 加载中默认返回false
    if (isLoading || isSyncing) return false;
    
    // 使用ref检查以避免闭包问题
    return permissionsRef.current.includes(permission as string);
  }, [isLoading, isSyncing]); // 显著减少依赖项

  // 其他权限检查函数也使用ref
  const hasAnyPermission = useCallback((requiredPermissions: (string | AdminPermission | UserPermission)[]): boolean => {
    if (isLoading || isSyncing) return false;
    return requiredPermissions.some(perm => permissionsRef.current.includes(perm as string));
  }, [isLoading, isSyncing]);

  const hasAllPermissions = useCallback((requiredPermissions: (string | AdminPermission | UserPermission)[]): boolean => {
    if (isLoading || isSyncing) return false;
    return requiredPermissions.every(perm => permissionsRef.current.includes(perm as string));
  }, [isLoading, isSyncing]);

  // 专用管理员权限检查
  const hasAdminPermission = useCallback((permission: AdminPermission): boolean => {
    if (isLoading || isSyncing) return false;
    return permissionsRef.current.includes(permission);
  }, [isLoading, isSyncing]);

  // 专用用户权限检查
  const hasUserPermission = useCallback((permission: UserPermission): boolean => {
    if (isLoading || isSyncing) return false;
    return permissionsRef.current.includes(permission);
  }, [isLoading, isSyncing]);

  // 管理员检查函数
  const isAdmin = useCallback((): boolean => {
    return permissionsRef.current.includes(AdminPermission.ADMIN_ACCESS);
  }, []);

  // 优化的权限刷新函数，使用防抖和强制周期限制
  const refreshPermissions = useCallback(
    debounce(async (): Promise<void> => {
      const now = Date.now();
      // 如果距离上次刷新不到10秒，避免刷新
      if (now - lastRefreshTime.current < 10000) {
        console.log('刷新间隔太短，跳过');
        return;
      }
      
      lastRefreshTime.current = now;
      
      try {
        const newPermissions = await fetchServerPermissions(true);
        
        // 只在权限确实变化时更新状态
        if (!areArraysEqual(permissionsRef.current, newPermissions)) {
          setPermissions([...new Set(newPermissions)]);
        }
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