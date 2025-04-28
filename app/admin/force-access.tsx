"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

// 主要组件
export default function ForceAccessPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // 检查是否有绕过标记
  useEffect(() => {
    const bypass = localStorage.getItem('admin_bypass');
    if (bypass === 'true') {
      setHasAccess(true);
      
      // 尝试加载权限
      try {
        const storedPermissions = localStorage.getItem('admin_permissions');
        if (storedPermissions) {
          setPermissions(JSON.parse(storedPermissions));
        }
      } catch (error) {
        console.error('无法解析权限:', error);
      }
    }
  }, []);
  
  // 返回常规管理员页面
  const handleGoToAdmin = () => {
    window.location.href = '/admin';
  };
  
  // 清除特殊标记
  const handleRemoveBypass = () => {
    localStorage.removeItem('admin_bypass');
    localStorage.removeItem('admin_permissions');
    window.location.reload();
  };
  
  // 未授权访问显示
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-red-500">未授权访问</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">您没有权限访问此页面。请先通过调试工具设置访问标记。</p>
            <Button onClick={() => window.location.href = '/admin/admin-debug'}>
              前往调试工具
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 正常管理员页面内容
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Card className="mb-6 border-yellow-500">
            <CardHeader className="bg-yellow-100 dark:bg-yellow-950">
              <CardTitle className="text-yellow-700 dark:text-yellow-300">
                管理员访问 (绕过模式)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-4 text-sm">
                您正在使用特殊模式访问管理员页面，绕过了常规的权限检查。
                这应该只用于调试目的。
              </p>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">当前权限:</h3>
                <div className="bg-muted p-3 rounded text-xs max-h-[200px] overflow-auto">
                  {permissions.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {permissions.map(p => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>没有加载到权限信息</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button onClick={handleGoToAdmin}>
                  尝试正常访问管理页面
                </Button>
                <Button variant="outline" onClick={handleRemoveBypass}>
                  移除绕过标记
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* 这里放其他管理员页面的内容 */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>系统状态</CardTitle>
              </CardHeader>
              <CardContent>
                <p>这里显示系统状态信息...</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>最近活动</CardTitle>
              </CardHeader>
              <CardContent>
                <p>这里显示最近活动信息...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 