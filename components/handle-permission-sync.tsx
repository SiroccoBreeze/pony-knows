"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/store";
import { useLoader } from "@/contexts/loader-context";

interface ApiDebugResponse {
  authenticated?: boolean;
  sessionUserId?: string;
  dbUser?: {
    id?: string;
    email?: string;
    name?: string;
  };
  roles?: Array<{
    roleName: string;
    permissions: string[];
  }>;
  permissions?: string[];
  hasAdminAccess?: boolean;
  error?: string;
  message?: string;
}

export default function HandlePermissionSync() {
  const { data: session, status, update } = useSession();
  const zustandLogin = useUserStore(state => state.login);
  const hasSynced = useRef(false);
  const { setLoading, setMessage } = useLoader();
  
  // 最多10分钟同步一次权限
  const SYNC_INTERVAL = 10 * 60 * 1000; // 10分钟
  const lastSyncTime = useRef<number>(0);
  
  // 处理页面刷新时的权限同步
  useEffect(() => {
    // 检测页面是否刚刷新加载
    const isPageRefresh = performance.navigation?.type === 1 || 
                          document.visibilityState === 'visible';
    
    if (isPageRefresh) {
      // 重置同步状态，强制刷新时同步权限
      hasSynced.current = false;
      localStorage.removeItem('cached_permissions_timestamp');
      console.log("检测到页面刷新，将重新同步权限");
    }
  }, []);
  
  // 简化后的权限同步逻辑，减少API调用
  useEffect(() => {
    // 确保只同步一次初始权限，后续减少调用频率
    if (!session?.user || hasSynced.current || status !== "authenticated") {
      return;
    }
    
    // 检查是否过了同步间隔
    const now = Date.now();
    if ((now - lastSyncTime.current) < SYNC_INTERVAL && lastSyncTime.current !== 0) {
      return;
    }
    
    // 检查本地存储中是否已有权限缓存
    const cachedPermissions = localStorage.getItem('cached_permissions');
    const cachedTimestamp = localStorage.getItem('cached_permissions_timestamp');
    const CACHE_VALID_DURATION = 5 * 60 * 1000; // 5分钟缓存有效期
    
    if (cachedPermissions && cachedTimestamp && 
        (now - parseInt(cachedTimestamp)) < CACHE_VALID_DURATION) {
      // 使用缓存数据，不进行API调用
      console.log("使用本地权限缓存，跳过同步");
      hasSynced.current = true;
      return;
    }
    
    const syncPermissions = async () => {
      if (window.__syncingPermissions) return;
      window.__syncingPermissions = true;
      
      try {
        // 设置加载状态
        setLoading(true);
        setMessage("正在同步权限数据...");
        
        lastSyncTime.current = now;
        
        // 添加缓存控制头，强制获取最新数据
        const response = await fetch('/api/auth/debug', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Permission-Sync': 'true',
            'X-Force-Refresh': 'true'
          }
        });
        
        if (!response.ok) {
          console.error('权限同步请求失败');
          return;
        }
        
        const data: ApiDebugResponse = await response.json();
        
        // 从API获取最新权限
        if (data.authenticated && data.permissions && data.roles) {
          // 缓存权限
          localStorage.setItem('cached_permissions', JSON.stringify(data.permissions));
          localStorage.setItem('cached_permissions_timestamp', now.toString());
          
          // 更新Zustand状态
          if (data.dbUser) {
            const zustandUser = {
              id: data.dbUser.id || '',
              name: data.dbUser.name || '',
              email: data.dbUser.email || '',
              roles: data.roles?.map((r) => ({
                role: {
                  name: r.roleName,
                  permissions: r.permissions || []
                }
              })) || [],
              permissions: data.permissions || []
            };
            
            zustandLogin(zustandUser);
          }
          
          // 更新NextAuth会话
          await update({
            roles: data.roles.map((r) => ({
              role: {
                name: r.roleName,
                permissions: r.permissions
              }
            })),
            permissions: data.permissions
          });
          
          hasSynced.current = true;
          console.log('权限同步完成，更新了', data.permissions.length, '个权限');
        }
      } catch (error) {
        console.error('权限同步失败:', error);
      } finally {
        // 关闭加载状态
        setLoading(false);
        setMessage(null);
        window.__syncingPermissions = false;
      }
    };
    
    syncPermissions();
  }, [session, status, update, zustandLogin, setLoading, setMessage]);
  
  // 不再渲染UI
  return null;
}

// 添加全局类型声明
declare global {
  interface Window {
    __syncingPermissions?: boolean;
  }
} 