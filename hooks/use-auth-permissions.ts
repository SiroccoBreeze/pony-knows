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

  // 未登录状态立即处理 - 最高优先级处理
  useEffect(() => {
    // 扩展未登录检查：包括无效的会话对象(无用户ID)或会话状态与用户状态不匹配
    const isEffectivelyUnauthenticated = status === "unauthenticated" || !session?.user?.id || 
      (status === "authenticated" && (!session?.user?.id || !localStorage.getItem('user-storage')));
    
    if (isEffectivelyUnauthenticated) {
      // 用户未登录或无效会话，立即设置空权限并标记为已初始化
      console.log("[权限] 用户未登录或会话无效，设置空权限");
      setPermissions([]);
      setIsLoading(false);
      permissionsInitialized.current = true;
      
      // 清除缓存，确保下次登录时重新获取权限
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_permissions');
        localStorage.removeItem('cached_permissions_timestamp');
      }
      
      // 重置全局缓存 - 确保不会使用旧会话的权限
      globalPermissionsCache = null;
      globalCacheTimestamp = 0;
      apiCallCount.current = 0;
    }
  }, [status, session]);

  // 从服务器获取最新权限 - 增强缓存与并发控制
  const fetchServerPermissions = useCallback(async (forceRefresh = false): Promise<string[]> => {
    // 更严格的未登录检查：状态为unauthenticated或没有有效用户ID
    const isEffectivelyUnauthenticated = status === "unauthenticated" || !session?.user?.id;
    
    if (isEffectivelyUnauthenticated) {
      console.log('[权限] 用户未登录或无有效用户ID，直接返回空权限');
      return [];
    }

    // 会话加载中，返回缓存或空数组
    if (status === "loading") {
      console.log('[权限] 会话正在加载，先使用缓存');
      return globalPermissionsCache || permissions || [];
    }
    
    // 已有挂起的请求，不重复发起
    if (pendingRequest) {
      console.log('[权限] 已有权限请求挂起，等待现有请求完成');
      return await pendingRequest;
    }
    
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
    if (!forceRefresh && typeof window !== 'undefined') {
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
    
    // 再次检查登录状态，避免在API请求前状态变化
    if (status !== "authenticated") {
      console.log("[权限] 发送API请求前用户状态改变为未登录，返回空权限");
      return [];
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
      
      if (typeof window !== 'undefined') {
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
      }
      
      // 如果真的没有任何缓存，则返回当前state或空数组
      return permissions.length > 0 ? permissions : [];
    }
    
    // 最终状态检查，确保只有已登录用户才发送API请求
    if (status !== "authenticated") {
      console.log("[权限] 发送API请求前最终检查：用户未登录，返回空权限");
      return [];
    }
    
    // 只有在确实需要时才发起API请求
    setIsSyncing(true);
    console.log('从服务器获取最新权限数据');
    
    // 创建请求Promise并存储在全局变量中
    pendingRequest = (async () => {
      try {
        // 再次检查是否仍需发送请求
        if (status !== "authenticated") {
          console.log(`[权限] 请求前状态变为${status}，取消API请求`);
          return [];
        }
        
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
        
        // 处理API返回的权限数据
        if (data.permissions) {
          console.log('从服务器获取的权限:', data.permissions.length);
          
          // 确保返回的是数组
          const permissionsArray = Array.isArray(data.permissions) ? data.permissions : [];
          
          // 仅在有权限数据时更新缓存
          if (permissionsArray.length > 0) {
            // 更新本地存储缓存
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_permissions', JSON.stringify(permissionsArray));
              localStorage.setItem('cached_permissions_timestamp', now.toString());
            }
            
            // 更新全局缓存
            globalPermissionsCache = permissionsArray;
            globalCacheTimestamp = now;
          }
          
          return permissionsArray;
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
  }, [permissions, status, session]);

  // 优化的初始化权限函数
  const initializePermissions = useCallback(async () => {
    // 已初始化，跳过
    if (permissionsInitialized.current) {
      console.log('[权限] 权限已初始化，跳过');
      return;
    }
    
    // 更严格的未登录检查
    const isEffectivelyUnauthenticated = status === "unauthenticated" || !session?.user?.id;
    
    if (isEffectivelyUnauthenticated) {
      console.log('[权限] 检测到未登录用户或无有效用户ID，设置空权限并标记为已初始化');
      setPermissions([]);
      setIsLoading(false);
      permissionsInitialized.current = true;
      return;
    }
    
    // 会话加载中，等待
    if (status === "loading") {
      console.log('[权限] 会话正在加载，等待会话状态确定');
      return;
    }
    
    // 确认有效的已认证状态：状态是authenticated且有用户ID
    if (status === "authenticated" && session?.user?.id) {
      console.log('[权限] 开始初始化权限，用户ID:', session.user.id);
      setIsLoading(true);
      
      try {
        console.log("初始化权限 - 获取权限数据");
        const serverPermissions = await fetchServerPermissions(false);
        
        // 使用深度比较避免不必要的状态更新
        if (!areArraysEqual(permissionsRef.current, serverPermissions)) {
          setPermissions([...new Set(serverPermissions)]);
          
          // 确保权限被存储到localStorage，便于全局访问
          if (typeof window !== 'undefined') {
            localStorage.setItem('cached_permissions', JSON.stringify(serverPermissions));
            localStorage.setItem('cached_permissions_timestamp', Date.now().toString());
            console.log("权限数据已刷新并缓存");
            
            // 触发全局事件，通知权限初始化完成
            window.dispatchEvent(new CustomEvent('permissions-initialized', {
              detail: { permissions: serverPermissions }
            }));
            console.log("权限初始化事件已触发");
          }
        }
        
        setIsLoading(false);
        permissionsInitialized.current = true;
      } catch (error) {
        console.error('权限初始化失败:', error);
        setPermissions([]);
        setIsLoading(false);
        permissionsInitialized.current = true;
      }
    } else {
      console.log('[权限] 会话状态不正确，无法初始化权限');
      setPermissions([]);
      setIsLoading(false);
      permissionsInitialized.current = true;
    }
  }, [status, session, fetchServerPermissions]);

  // 初始化权限 - 使用防抖减少执行次数
  useEffect(() => {
    // 对于未登录用户，立即初始化
    if (status === "unauthenticated" && !permissionsInitialized.current) {
      console.log("[权限] 未登录用户，立即初始化空权限");
      setPermissions([]);
      setIsLoading(false);
      permissionsInitialized.current = true;
      return;
    }
    
    // 对于已登录用户，使用防抖初始化
    if (status === "authenticated" && !permissionsInitialized.current) {
      const timer = setTimeout(() => {
        initializePermissions();
      }, 100);
      
      return () => clearTimeout(timer);
    }
    
    // 清理函数
    return () => {
      // 组件卸载时重置API调用计数
      apiCallCount.current = 0;
    };
  }, [status, initializePermissions]);

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
      // 未登录用户不进行权限刷新
      if (status !== "authenticated") {
        console.log('[权限] 未登录用户无需刷新权限');
        return;
      }
      
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
    [fetchServerPermissions, status]
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