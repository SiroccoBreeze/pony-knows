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
const GLOBAL_CACHE_DURATION = 20000; // 全局缓存20秒有效

export function useAuthPermissions() {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const permissionsInitialized = useRef(false)
  const apiCallCount = useRef(0)

  // 从服务器获取最新权限 - 增强缓存机制
  const fetchServerPermissions = useCallback(async (forceRefresh = false): Promise<string[]> => {
    // 使用全局缓存（如果有效且未强制刷新）
    if (
      !forceRefresh && 
      globalPermissionsCache && 
      (Date.now() - globalCacheTimestamp) < GLOBAL_CACHE_DURATION
    ) {
      console.log('使用全局缓存的权限数据');
      return globalPermissionsCache;
    }
    
    // 使用本地存储缓存
    const CACHE_DURATION = 15000; // 15秒
    
    try {
      // 如果未强制刷新且缓存有效，使用缓存的权限
      if (!forceRefresh) {
        const cachedPermissionsData = localStorage.getItem('cached_permissions');
        const cachedTimestamp = localStorage.getItem('cached_permissions_timestamp');
        
        if (
          cachedPermissionsData && 
          cachedTimestamp && 
          (Date.now() - parseInt(cachedTimestamp)) < CACHE_DURATION
        ) {
          const parsedPermissions = JSON.parse(cachedPermissionsData);
          // 更新全局缓存
          globalPermissionsCache = parsedPermissions;
          globalCacheTimestamp = Date.now();
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
      const response = await fetch('/api/auth/debug', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) return globalPermissionsCache || [];
      
      const data: ApiDebugResponse = await response.json();
      
      if (data.authenticated && data.permissions) {
        // 更新缓存
        localStorage.setItem('cached_permissions', JSON.stringify(data.permissions));
        localStorage.setItem('cached_permissions_timestamp', Date.now().toString());
        
        // 更新全局缓存
        globalPermissionsCache = data.permissions;
        globalCacheTimestamp = Date.now();
        
        return data.permissions;
      }
      
      return globalPermissionsCache || [];
    } catch (error) {
      console.error('获取服务器权限失败:', error);
      return globalPermissionsCache || [];
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
      
      if (session?.user) {
        try {
          // 从会话中提取权限（如果存在）
          const sessionPermissions: string[] = [];
          if (session.user.roles) {
            session.user.roles.forEach(role => {
              if (role.role.permissions) {
                sessionPermissions.push(...role.role.permissions);
              }
            });
          }
          
          // 如果会话中有权限，使用会话权限初始化
          if (sessionPermissions.length > 0) {
            if (mounted) {
              setPermissions([...new Set(sessionPermissions)]);
              setIsLoading(false);
              permissionsInitialized.current = true;
            }
            
            // 在后台异步刷新一次权限，但不阻塞界面
            setTimeout(() => {
              fetchServerPermissions().then(serverPermissions => {
                if (mounted) {
                  setPermissions([...new Set(serverPermissions)]);
                }
              }).catch(console.error);
            }, 3000); // 延迟3秒异步更新
            
            return;
          }
          
          // 会话中没有权限，从服务器获取
          const serverPermissions = await fetchServerPermissions();
          if (mounted) {
            setPermissions([...new Set(serverPermissions)]);
            setIsLoading(false);
            permissionsInitialized.current = true;
          }
        } catch (error) {
          console.error('服务器权限获取失败，回退到会话权限:', error);
          
          // 完全失败时设置空权限并完成加载
          if (mounted) {
            setPermissions([]);
            setIsLoading(false);
            permissionsInitialized.current = true;
          }
        }
      } else {
        // 没有登录会话，设置空权限并完成加载
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

  // 检查是否具有指定权限 - 优先使用缓存权限，减少服务器查询
  const hasPermissionWithServerCheck = async (permission: string | Permission | AdminPermission | UserPermission): Promise<boolean> => {
    // 如果正在加载中，默认返回false
    if (isLoading) return false;
    
    // 如果本地缓存的权限已包含该权限，直接返回true无需查询服务器
    if (permissions.includes(permission as string)) {
      return true;
    }
    
    // 检查全局缓存
    if (globalPermissionsCache && globalPermissionsCache.includes(permission as string)) {
      return true;
    }
    
    // 本地缓存不包含该权限时，才从服务器获取最新权限进行二次确认
    const serverPermissions = await fetchServerPermissions();
    
    // 使用服务器最新权限检查
    return serverPermissions.includes(permission as string);
  }

  // 检查是否具有指定权限 - 使用当前缓存权限
  const hasPermission = (permission: string | Permission | AdminPermission | UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查权限数组是否包含指定权限
    return permissions.includes(permission as string);
  }

  // 检查是否具有任意一个指定权限
  const hasAnyPermission = (requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查是否有任一权限匹配
    return requiredPermissions.some(perm => permissions.includes(perm as string));
  }

  // 检查是否具有所有指定权限
  const hasAllPermissions = (requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 检查是否所有权限都匹配
    return requiredPermissions.every(perm => permissions.includes(perm as string));
  }

  // 检查是否具有管理员权限
  const hasAdminPermission = (permission: AdminPermission): boolean => {
    if (isLoading || isSyncing) return false;
    return permissions.includes(permission);
  }

  // 检查是否具有用户端权限
  const hasUserPermission = (permission: UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading || isSyncing) return false;
    
    // 直接使用字符串形式比较权限，确保匹配
    console.log(`[hasUserPermission] 检查权限: ${permission}, 当前用户权限:`, permissions);
    const result = permissions.includes(permission);
    console.log(`[hasUserPermission] ${permission} 检查结果:`, result);
    return result;
  }

  // 检查是否为管理员（有任何管理员权限）
  const isAdmin = (): boolean => {
    if (isLoading || isSyncing) return false;
    return permissions.includes(AdminPermission.ADMIN_ACCESS);
  }

  // 强制刷新权限 - 优化更新逻辑
  const refreshPermissions = async (): Promise<void> => {
    // 清除所有缓存
    localStorage.removeItem('cached_permissions');
    localStorage.removeItem('cached_permissions_timestamp');
    globalPermissionsCache = null;
    globalCacheTimestamp = 0;
    
    // 强制从服务器获取最新权限
    const serverPermissions = await fetchServerPermissions(true);
    setPermissions([...new Set(serverPermissions)]);
  }

  return {
    permissions,
    isLoading: isLoading || isSyncing,
    isAuthenticated: status === "authenticated",
    hasPermission,
    hasPermissionWithServerCheck,
    hasAnyPermission,
    hasAllPermissions,
    hasAdminPermission,
    hasUserPermission,
    isAdmin,
    refreshPermissions
  }
} 