"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDebugPage() {
  const { data: session, status, update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  
  // 使用权限钩子
  const { 
    isAdmin, 
    isLoading, 
    permissions: userPermissions, 
    hasAdminPermission 
  } = useAuthPermissions();
  
  // 从API获取最新权限
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/auth/debug');
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        console.error('获取API数据失败:', error);
      }
    }
    
    fetchData();
  }, []);
  
  // 立即强制刷新会话
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/debug');
      if (response.ok) {
        const data = await response.json();
        
        // 更新会话
        if (data.roles) {
          await update({
            roles: data.roles.map((r: any) => ({
              role: {
                name: r.roleName,
                permissions: r.permissions
              }
            }))
          });
          
          console.log("会话已更新，包含新的角色和权限");
        }
      }
      
      // 刷新页面
      window.location.reload();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">管理员权限调试</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>会话状态</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="font-semibold">Session状态:</dt>
            <dd>{status}</dd>
            
            <dt className="font-semibold">权限加载:</dt>
            <dd>{isLoading ? "加载中..." : "已完成"}</dd>
            
            <dt className="font-semibold">是否管理员:</dt>
            <dd>{isAdmin() ? "是" : "否"}</dd>
            
            <dt className="font-semibold">有admin_access权限:</dt>
            <dd>{hasAdminPermission(AdminPermission.ADMIN_ACCESS) ? "是" : "否"}</dd>
            
            <dt className="font-semibold">权限总数:</dt>
            <dd>{userPermissions.length}</dd>
          </dl>
          
          <div className="mt-4">
            <Button onClick={handleForceRefresh} disabled={isRefreshing}>
              {isRefreshing ? "正在刷新..." : "强制刷新会话"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>会话权限</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded max-h-[300px] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(userPermissions, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API返回的权限</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded max-h-[300px] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {apiData ? JSON.stringify(apiData.permissions, null, 2) : "加载中..."}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>完整会话数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded max-h-[300px] overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 