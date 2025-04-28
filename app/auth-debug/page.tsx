"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useSession } from "next-auth/react";
import { Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server } from "lucide-react";
import { useState } from "react";

// API响应类型
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

export default function AuthDebugPage() {
  const { data: session, status, update } = useSession();
  const { isAdmin, userPermissions, user, hasPermission } = useAuthPermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiData, setApiData] = useState<ApiDebugResponse | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  
  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await update();
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const fetchApiDebugData = async () => {
    setIsLoadingApi(true);
    try {
      const response = await fetch('/api/auth/debug');
      const data = await response.json();
      setApiData(data);
    } catch (error) {
      console.error('获取API调试数据失败:', error);
      setApiData({ error: '获取API调试数据失败' });
    } finally {
      setIsLoadingApi(false);
    }
  };
  
  // 直接跳转到管理员页面的函数
  const goToAdminPage = () => {
    window.location.href = '/admin';
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">权限调试页面</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefreshSession} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新会话
          </Button>
          <Button onClick={fetchApiDebugData} disabled={isLoadingApi}>
            <Server className={`mr-2 h-4 w-4 ${isLoadingApi ? 'animate-spin' : ''}`} />
            获取API权限数据
          </Button>
          <Button onClick={goToAdminPage} variant="secondary">
            前往管理页面
          </Button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">会话状态</h2>
        <p className="mb-2"><span className="font-semibold">状态:</span> {status}</p>
        <p className="mb-2"><span className="font-semibold">isAdmin:</span> {isAdmin ? '是' : '否'}</p>
        <p className="mb-2"><span className="font-semibold">是否拥有ADMIN_ACCESS权限:</span> {hasPermission(Permission.ADMIN_ACCESS) ? '是' : '否'}</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">用户权限</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
          {JSON.stringify(userPermissions, null, 2)}
        </pre>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">用户信息</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">完整会话</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
      
      {apiData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">API权限数据</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
            {JSON.stringify(apiData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 