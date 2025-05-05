"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 管理员界面布局组件
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  // 组件挂载时添加admin-mode类
  useEffect(() => {
    // 添加admin-mode类，用于修改全局样式
    document.body.classList.add('admin-mode');
    
    // 组件卸载时移除admin-mode类
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, []);
  
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