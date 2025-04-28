"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForceRefreshPage() {
  const { data: session, status, update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 获取API数据以比较
    async function fetchData() {
      try {
        const response = await fetch('/api/auth/debug');
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        console.error('获取API数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    setSessionData(session);
    fetchData();
  }, [session]);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 强制更新会话
      await update();
      
      // 短暂延迟以确保更新完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新加载页面
      window.location.href = '/admin';
    } catch (error) {
      console.error('刷新会话失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    // 清除缓存的方式退出
    try {
      // 清除localStorage和sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // 删除所有cookie
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      });
      
      // 重定向到登录页
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('退出失败:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">会话刷新工具</CardTitle>
          <CardDescription>
            解决权限不同步问题，刷新您的会话数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p>
              当前会话状态: <span className="font-semibold">{status}</span>
            </p>
            
            <div className="flex gap-4 mt-4">
              <Button 
                onClick={handleForceRefresh} 
                disabled={isRefreshing || status !== 'authenticated'}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                强制刷新会话
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleLogout}
              >
                完全清除并重新登录
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2">加载中...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">客户端会话数据:</h3>
                <div className="bg-muted p-4 rounded text-xs overflow-auto max-h-[400px]">
                  <pre>{JSON.stringify(sessionData, null, 2)}</pre>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">服务端API数据:</h3>
                <div className="bg-muted p-4 rounded text-xs overflow-auto max-h-[400px]">
                  <pre>{JSON.stringify(apiData, null, 2)}</pre>
                </div>
                
                {apiData?.hasAdminAccess && !sessionData?.user?.roles?.some(r => 
                  r.role.permissions.includes('admin_access')
                ) && (
                  <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                    <p className="text-sm font-semibold">检测到权限不同步问题!</p>
                    <p className="text-xs mt-1">
                      服务端显示您拥有管理员权限，但客户端会话中没有这些权限。
                      请点击"强制刷新会话"按钮。
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 