"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/store";
import { useLoader } from "@/contexts/loader-context";
import { resetGlobalPermissionsCache } from "@/hooks/use-auth-permissions";

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
  refreshedAt?: string;
}

// 扩展会话用户类型以包含权限
interface ExtendedSessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  permissions?: string[];
  roles?: Array<{
    role: {
      name: string;
      permissions: string[];
    };
  }>;
}

// 全局锁定，防止多次刷新
let isSyncingGlobally = false;

// 记录上一次权限同步的时间
let lastGlobalSyncTime = 0;
const MIN_SYNC_INTERVAL = 5000; // 最短同步间隔5秒

// 简单的锁定计时器
let lockTimeoutId: NodeJS.Timeout | null = null;

// 防止循环刷新的计数器
let refreshCounter = 0;
const MAX_REFRESH_COUNT = 3; // 最大刷新次数

export default function HandlePermissionSync() {
  const { data: session, status, update } = useSession();
  const zustandLogin = useUserStore(state => state.login);
  const resetPermissions = useUserStore(state => state.resetPermissions);
  const hasSynced = useRef(false);
  const { setLoading, setMessage } = useLoader();
  
  // 记录上次同步时间
  const lastSyncTime = useRef<number>(0);
  const mountedRef = useRef(false);
  
  // 检查是否应该进行权限同步
  const shouldSync = () => {
    const now = Date.now();
    
    // 正在全局同步中，跳过
    if (isSyncingGlobally) {
      console.log("全局同步锁定中，跳过同步");
      return false;
    }
    
    // 检查同步间隔
    if (now - lastGlobalSyncTime < MIN_SYNC_INTERVAL) {
      console.log("同步间隔小于最小值，跳过同步");
      return false;
    }
    
    // 刷新次数过多，跳过
    if (refreshCounter >= MAX_REFRESH_COUNT) {
      console.log("刷新次数过多，可能存在循环，跳过同步");
      return false;
    }
    
    // 检查之前的锁定
    if (lockTimeoutId) {
      console.log("存在未释放的锁定，跳过同步");
      return false;
    }
    
    return true;
  }
  
  // 获取锁定
  const acquireLock = () => {
    if (!shouldSync()) return false;
    
    // 设置全局锁定
    isSyncingGlobally = true;
    lastGlobalSyncTime = Date.now();
    refreshCounter++;
    
    // 设置超时自动释放锁定，防止死锁
    lockTimeoutId = setTimeout(() => {
      isSyncingGlobally = false;
      lockTimeoutId = null;
    }, 10000); // 10秒后自动释放锁
    
    console.log(`获取同步锁定，第${refreshCounter}次同步`);
    return true;
  }
  
  // 释放锁定
  const releaseLock = () => {
    if (lockTimeoutId) {
      clearTimeout(lockTimeoutId);
      lockTimeoutId = null;
    }
    
    isSyncingGlobally = false;
    console.log("释放同步锁定");
  }
  
  // 页面刷新和应用启动处理
  useEffect(() => {
    // 组件首次挂载时
    if (!mountedRef.current) {
      mountedRef.current = true;
      
      // 如果已达到最大刷新次数，重置计数器但不执行同步
      if (refreshCounter >= MAX_REFRESH_COUNT) {
        refreshCounter = 0; // 重置计数器，下次再试
        localStorage.setItem('refresh_cooldown', 'true');
        return;
      }
      
      // 检查是否在冷却期
      const isCooldown = localStorage.getItem('refresh_cooldown') === 'true';
      if (isCooldown) {
        // 清除冷却标记，但这次不同步
        localStorage.removeItem('refresh_cooldown');
        return;
      }
      
      // 彻底重置权限同步状态和所有缓存
      const forceReset = () => {
        console.log("彻底重置所有权限缓存和同步状态");
        
        try {
          // 清除所有本地权限缓存
          localStorage.removeItem('cached_permissions');
          localStorage.removeItem('cached_permissions_timestamp');
          
          // 清除所有会话存储
          sessionStorage.clear();
          
          // 重置全局缓存
          resetGlobalPermissionsCache();
          
          // 重置同步状态
          hasSynced.current = false;
          lastSyncTime.current = 0;
          
          // 重置全局状态中的权限
          resetPermissions();
          
          // 设置标记，通知需要强制从数据库刷新
          sessionStorage.setItem('force_permission_refresh', 'true');
          sessionStorage.setItem('force_reset_timestamp', Date.now().toString());
        } catch (error) {
          console.error("重置权限缓存错误:", error);
        }
      };
      
      // 每次组件挂载时强制重置
      forceReset();
    }
    
    // 组件卸载时清除锁定
    return () => releaseLock();
  }, [resetPermissions]);
  
  // 权限同步逻辑
  useEffect(() => {
    // 确保只在用户已登录时同步
    if (!session?.user || status !== "authenticated") {
      return;
    }
    
    // 如果已同步且不是强制刷新，则不重复同步
    const forceRefresh = sessionStorage.getItem('force_permission_refresh') === 'true';
    if (hasSynced.current && !forceRefresh) {
      return;
    }
    
    // 尝试获取同步锁定，失败则返回
    if (!acquireLock()) {
      return;
    }
    
    // 当前会话用户（可能包含权限）
    const sessionUser = session.user as ExtendedSessionUser;
    
    // 同步权限的函数
    const syncPermissions = async () => {
      try {
        console.log("开始同步权限");
        // 设置加载状态
        setLoading(true);
        setMessage("正在从数据库加载最新权限数据...");
        
        const now = Date.now();
        lastSyncTime.current = now;
        
        // 先重置全局权限状态
        resetPermissions();
        
        // 强制清除所有缓存
        resetGlobalPermissionsCache();
        localStorage.removeItem('cached_permissions');
        localStorage.removeItem('cached_permissions_timestamp');
        
        // 随机字符串确保完全破坏缓存
        const randomStr = Math.random().toString(36).substring(2);
        
        // 添加缓存控制头，强制获取最新数据
        console.log("请求最新权限数据");
        const response = await fetch(`/api/auth/debug?_=${now}&random=${randomStr}`, {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Permission-Sync': 'true',
            'X-Force-Refresh': 'true',
            'X-Timestamp': now.toString(),
            'X-Random': randomStr,
            'X-Auth-Session-Id': sessionUser.id || 'unknown'
          }
        });
        
        if (!response.ok) {
          console.error('权限同步请求失败:', response.status);
          return;
        }
        
        const data: ApiDebugResponse = await response.json();
        
        // 打印详细日志
        console.log("API返回的完整权限数据:", data);
        
        // 从API获取最新权限
        if (data.authenticated && data.permissions && data.roles) {
          // 记录权限变更
          console.log("权限更新详情:", {
            旧权限数量: sessionUser.permissions?.length || 0,
            新权限数量: data.permissions.length,
            刷新时间: data.refreshedAt
          });
          
          // 如果数据库返回的权限数量与当前会话相同，不需要更新
          if (
            sessionUser.permissions?.length === data.permissions.length &&
            JSON.stringify(sessionUser.permissions?.sort()) === JSON.stringify(data.permissions.sort())
          ) {
            console.log("权限数据未变化，无需更新");
            hasSynced.current = true;
            sessionStorage.removeItem('force_permission_refresh');
            return;
          }
          
          console.log("更新Zustand状态");
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
          
          hasSynced.current = true;
          sessionStorage.removeItem('force_permission_refresh');
          localStorage.setItem('cached_permissions', JSON.stringify(data.permissions));
          localStorage.setItem('cached_permissions_timestamp', now.toString());
          
          console.log("权限同步完成，保存到本地存储");
        } else {
          console.error('权限同步返回了无效数据:', data);
        }
      } catch (error) {
        console.error('权限同步失败:', error);
      } finally {
        // 关闭加载状态
        setLoading(false);
        setMessage(null);
        releaseLock();
      }
    };
    
    // 立即执行权限同步
    syncPermissions();
  }, [session, status, update, zustandLogin, setLoading, setMessage, resetPermissions]);
  
  // 不再渲染UI
  return null;
}

// 添加全局类型声明
declare global {
  interface Window {
    __syncingPermissions?: boolean;
  }
} 