"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useEffect, useState, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { notFound } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { permissions, isAuthenticated, isLoading } = useAuthPermissions();
  const [hasChecked, setHasChecked] = useState(false);
  const permissionCheckTimer = useRef<NodeJS.Timeout | null>(null);
  
  // 确保组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (permissionCheckTimer.current) {
        clearTimeout(permissionCheckTimer.current);
      }
      // 组件卸载时移除admin-mode类
      document.body.classList.remove('admin-mode');
    };
  }, []);
  
  // 检查管理员权限
  useEffect(() => {
    // 避免重复检查
    if (hasChecked) return;
    
    // 如果权限仍在加载中，等待
    if (isLoading) return;
    
    // 确保权限已加载完成，使用小延迟
    permissionCheckTimer.current = setTimeout(() => {
      // 设置为已检查
      setHasChecked(true);
      
      // 直接使用字符串形式检查权限
      const hasAdminAccess = permissions.includes("admin_access");
      
      console.log("[AdminLayout] 管理员权限检查(延迟执行):", {
        hasAccess: hasAdminAccess,
        expectedPermission: "admin_access", 
        permissions: permissions,
        permissionsCount: permissions.length
      });
      
      if (hasAdminAccess) {
        // 移除普通导航栏，管理员界面专注于管理功能
        document.body.classList.add('admin-mode');
      } else {
        // 检查本地存储的绕过标记
        const bypass = localStorage.getItem('admin_bypass');
        if (bypass === 'true') {
          document.body.classList.add('admin-mode');
        } else {
          // 没有权限也没有绕过标记，显示404
          console.log("[AdminLayout] 用户没有管理员权限");
          notFound();
        }
      }
    }, 500); // 500ms延迟，确保权限已完全同步
  }, [permissions, isAuthenticated, hasChecked, isLoading]);
  
  // 权限检查完成前显示简单的加载指示
  if (!hasChecked) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">权限验证中...</p>
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