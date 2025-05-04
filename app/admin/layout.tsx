"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { notFound } from "next/navigation";
import { AdminPermission } from "@/lib/permissions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { hasAdminPermission, permissions, isLoading, isAuthenticated } = useAuthPermissions();
  const [showContent, setShowContent] = useState(false);
  
  // 统一的权限与导航管理
  useEffect(() => {
    // 判断用户是否有管理员权限
    const isAdmin = hasAdminPermission(AdminPermission.ADMIN_ACCESS);
    
    // 打印调试信息
    console.log("[AdminLayout] 权限状态:", { 
      isAdmin, 
      isLoading, 
      permissionsCount: permissions.length,
      hasAdminAccess: permissions.includes(AdminPermission.ADMIN_ACCESS),
      isAuthenticated
    });
    
    // 只在加载完成后再做权限判断
    if (isLoading) {
      console.log("[AdminLayout] 权限加载中，等待...");
      return;
    }
    
    // 如果是管理员，显示内容
    if (isAdmin) {
      console.log("[AdminLayout] 用户是管理员，允许访问");
      
      // 移除普通导航栏，管理员界面专注于管理功能
      document.body.classList.add('admin-mode');
      
      setShowContent(true);
      return;
    }
    
    // 特殊处理：检查是否有本地存储的绕过标记
    const bypass = localStorage.getItem('admin_bypass');
    if (bypass === 'true') {
      console.log("[AdminLayout] 发现本地绕过标记，允许访问");
      
      // 同样移除普通导航栏
      document.body.classList.add('admin-mode');
      
      setShowContent(true);
      return;
    }
    
    // 只有当权限加载完成且确认没有权限时，才显示404
    if (!isLoading && !isAdmin) {
      console.log("[AdminLayout] 确认用户没有管理员权限，显示404页面", { 
        权限总数: permissions.length,
        拥有权限: permissions
      });
      
      // 使用notFound()函数显示404页面
      notFound();
    }
    
    // 组件卸载时移除类名
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, [hasAdminPermission, isLoading, permissions, isAuthenticated]);
  
  // 在加载状态或未确认权限时显示加载界面
  if (isLoading || !showContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">正在加载管理界面...</p>
        </div>
      </div>
    );
  }
  
  // 渲染管理界面 - 未包含普通导航栏
  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-muted/20">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
} 