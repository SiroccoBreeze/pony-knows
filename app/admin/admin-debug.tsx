"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Permission } from "@/lib/permissions";

export default function AdminDebugPage() {
  const { data: session, status, update } = useSession();
  const [apiData, setApiData] = useState<any>(null);
  const [isWorking, setIsWorking] = useState(false);
  
  // 获取API端点数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/auth/debug');
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        console.error('获取API数据失败:', error);
      }
    };
    
    fetchData();
  }, []);
  
  // 强制绕过权限检查
  const handleBypassCheck = async () => {
    setIsWorking(true);
    try {
      if (!apiData?.roles) {
        alert('无法获取API角色数据');
        return;
      }
      
      // 首先尝试会话更新
      await update({
        roles: apiData.roles.map((r: any) => ({
          role: {
            name: r.roleName,
            permissions: r.permissions
          }
        }))
      });
      
      // 添加localStorage标记
      localStorage.setItem('admin_bypass', 'true');
      localStorage.setItem('admin_permissions', JSON.stringify(apiData.permissions));
      
      // 刷新页面
      window.location.href = '/admin';
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败: ' + error);
    } finally {
      setIsWorking(false);
    }
  };
  
  // 直接访问管理员模式
  const handleDirectAccess = () => {
    // 设置绕过标记
    localStorage.setItem('admin_bypass', 'true');
    if (apiData?.permissions) {
      localStorage.setItem('admin_permissions', JSON.stringify(apiData.permissions));
    }
    
    // 直接跳转到管理员页面
    window.location.href = '/admin/force-access';
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>管理员权限检查绕过工具</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-yellow-500">
            ⚠️ 此页面仅用于调试，允许绕过常规权限检查进入管理员界面
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">会话状态:</h3>
              <div className="bg-muted p-3 rounded text-xs">
                <p>会话状态: {status}</p>
                <p>用户ID: {session?.user?.id || '未知'}</p>
                <p>用户名: {session?.user?.name || '未知'}</p>
                <p>角色数量: {session?.user?.roles?.length || 0}</p>
                <p>
                  拥有admin_access: {
                    session?.user?.roles?.some(r => 
                      r.role.permissions?.includes(Permission.ADMIN_ACCESS)
                    ) ? '是' : '否'
                  }
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">服务器权限状态:</h3>
              <div className="bg-muted p-3 rounded text-xs">
                <p>API状态: {apiData ? '已加载' : '加载中...'}</p>
                <p>权限数量: {apiData?.permissions?.length || 0}</p>
                <p>
                  拥有admin_access: {
                    apiData?.permissions?.includes(Permission.ADMIN_ACCESS)
                      ? '是' : '否'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 space-x-4">
            <Button 
              onClick={handleBypassCheck} 
              disabled={isWorking || !apiData}
              variant="default"
            >
              更新会话并尝试访问
            </Button>
            
            <Button 
              onClick={handleDirectAccess}
              variant="destructive"
            >
              直接进入管理员界面(绕过检查)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 