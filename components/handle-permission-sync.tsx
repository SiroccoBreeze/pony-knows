"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut } from "lucide-react";
import { useUserStore } from "@/store";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  
  // 获取Zustand状态和更新函数
  const zustandLogin = useUserStore(state => state.login);
  
  // 检查权限同步状态
  useEffect(() => {
    const checkPermissionSync = async () => {
      if (!session?.user) {
        return;
      }
      
      try {
        const response = await fetch('/api/auth/debug');
        const data: ApiDebugResponse = await response.json();
        
        // 检查是否需要同步
        if (data.authenticated) {
          // 从session中获取权限 - 使用flatMap从roles中提取
          const sessionRoles = session.user.roles || [];
          const sessionPermissions: string[] = [];
          
          // 手动遍历roles提取权限，避免TypeScript错误
          sessionRoles.forEach(roleObj => {
            if (roleObj.role && Array.isArray(roleObj.role.permissions)) {
              sessionPermissions.push(...roleObj.role.permissions);
            }
          });
          
          const apiPermissions = data.permissions || [];
          
          console.log('会话权限:', sessionPermissions);
          console.log('API权限:', apiPermissions);
          
          // 检查是否有admin_access权限
          const sessionHasAdminAccess = sessionPermissions.includes('admin_access');
          const apiHasAdminAccess = apiPermissions.includes('admin_access');
          
          // 检查API中有但会话中没有的权限
          const missingPermissions = apiPermissions.filter(p => !sessionPermissions.includes(p));
          
          // 如果API返回的权限与会话中的权限不一致，需要同步
          if ((!sessionHasAdminAccess && apiHasAdminAccess) || missingPermissions.length > 0) {
            console.log('检测到权限不一致，需要同步。缺少权限:', missingPermissions);
            setNeedsSync(true);
          } else {
            setNeedsSync(false);
          }
        }
      } catch (error) {
        console.error('检查权限同步时出错:', error);
      }
    };
    
    if (status === 'authenticated') {
      checkPermissionSync();
    }
  }, [session, status]);
  
  // 强制刷新会话
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 先获取最新服务端数据
      const response = await fetch('/api/auth/debug');
      if (response.ok) {
        const data: ApiDebugResponse = await response.json();
        
        // 如果存在用户数据，更新Zustand状态
        if (data.dbUser) {
          // 类型安全的处理
          interface RoleData {
            roleName: string; 
            permissions: string[];
          }
          
          const zustandUser = {
            id: data.dbUser.id || '',
            name: data.dbUser.name || '',
            email: data.dbUser.email || '',
            // 类型安全的处理roles和permissions
            roles: data.roles?.map((r: RoleData) => ({
              role: {
                name: r.roleName,
                permissions: r.permissions || []
              }
            })) || [],
            permissions: data.permissions || []
          };
          
          // 更新Zustand状态
          zustandLogin(zustandUser);
          
          // 更新NextAuth会话
          if (data.roles) {
            await update({
              roles: data.roles.map((r: RoleData) => ({
                role: {
                  name: r.roleName,
                  permissions: r.permissions
                }
              })),
              permissions: data.permissions // 直接添加permissions到会话中
            });
          }
        }
      }
      
      // 延迟后强制刷新页面
      setTimeout(() => {
        console.log('刷新页面以应用新权限...');
        window.location.href = '/admin'; // 直接跳转到admin页面
      }, 1000);
    } catch (error) {
      console.error('刷新会话失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // 完全清除并登出
  const handleFullLogout = async () => {
    try {
      // 清除localStorage和sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // 删除所有cookie
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      });
      
      // 通过NextAuth登出
      await signOut({ redirect: false });
      
      // 重定向到登录页
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('登出失败:', error);
    }
  };
  
  // 如果不需要同步，则不显示任何内容
  if (!needsSync) return null;
  
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="max-w-md mx-auto bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-sm mb-2">检测到权限同步问题</h3>
        <p className="text-xs mb-4">
          您的会话数据与服务器上的权限数据不一致。服务器中包含新的权限设置，但您的会话中尚未更新。请刷新会话以获取最新权限。
        </p>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleForceRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新会话
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleFullLogout}
          >
            <LogOut className="mr-2 h-3 w-3" />
            完全退出
          </Button>
        </div>
      </div>
    </div>
  );
} 