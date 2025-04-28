"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { notFound } from "next/navigation";

// 超级管理员邮箱列表 - 这些邮箱的用户始终可以访问管理页面
const ADMIN_EMAILS = ['admin@example.com'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, userPermissions, user } = useAuthPermissions();
  const [showContent, setShowContent] = useState(false);
  
  // 统一的权限与导航管理
  useEffect(() => {
    // 打印调试信息
    console.log("[AdminLayout] 权限状态:", { 
      isAdmin, 
      isLoading, 
      permissionsCount: userPermissions.length,
      hasAdminAccess: userPermissions.includes('admin_access'),
      email: user?.email,
    });
    
    // 只在加载完成后再做权限判断
    if (isLoading) {
      console.log("[AdminLayout] 权限加载中，等待...");
      return;
    }
    
    // 如果是管理员，显示内容
    if (isAdmin) {
      console.log("[AdminLayout] 用户是管理员，允许访问");
      setShowContent(true);
      return;
    }
    
    // 特殊处理：超级管理员邮箱始终可以访问
    if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      console.log(`[AdminLayout] 超级管理员邮箱 ${user.email}，允许访问`);
      setShowContent(true);
      localStorage.setItem('admin_bypass', 'true');
      return;
    }
    
    // 检查是否有本地存储的绕过标记
    const bypass = localStorage.getItem('admin_bypass');
    if (bypass === 'true') {
      console.log("[AdminLayout] 发现本地绕过标记，允许访问");
      setShowContent(true);
      return;
    }
    
    // 只有当权限加载完成且确认没有权限时，才显示404
    if (!isLoading && !isAdmin) {
      console.log("[AdminLayout] 确认用户没有管理员权限，显示404页面", { 
        权限总数: userPermissions.length,
        拥有权限: userPermissions
      });
      
      // 使用notFound()函数显示404页面
      notFound();
    }
  }, [isAdmin, isLoading, userPermissions, user]);
  
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
  
  // 渲染管理界面
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
} 