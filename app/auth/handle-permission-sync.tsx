"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

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
  const router = useRouter();
  
  // 检查权限同步状态
  useEffect(() => {
    async function checkPermissionSync() {
      try {
        const response = await fetch('/api/auth/debug');
        if (!response.ok) return;
        
        const data: ApiDebugResponse = await response.json();
        
        // 获取会话中的权限
        const sessionPermissions = session?.user?.roles?.flatMap(role => 
          role.role.permissions || []
        ) || [];
        
        // 获取API返回的数据库权限
        const dbPermissions = data.permissions || [];
        
        // 检查是否存在同步问题 - 特别是管理员权限
        const sessionHasAdminAccess = sessionPermissions.includes('admin_access');
        const dbHasAdminAccess = dbPermissions.includes('admin_access');
        
        if (dbHasAdminAccess && !sessionHasAdminAccess) {
          console.log('检测到权限同步问题：数据库有管理员权限但会话中没有');
          setNeedsSync(true);
        } else {
          setNeedsSync(false);
        }
      } catch (error) {
        console.error('检查权限同步失败:', error);
      }
    }
    
    if (status === 'authenticated') {
      checkPermissionSync();
    }
  }, [session, status]);
  
  // 强制刷新会话
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await update();
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
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
      
      // 通过NextAuth登出
      await signOut({ redirect: false });
      
      // 重定向到登录页
      router.push('/auth/login');
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
          您的会话数据与服务器上的权限数据不一致。数据库中您有管理员权限，但会话中无法识别。
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