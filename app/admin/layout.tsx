"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, isAuthenticated } = useAuthPermissions();
  
  // 如果用户正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">加载中...</p>
        </div>
      </div>
    );
  }
  
  // 如果用户未登录或没有管理权限，重定向到首页
  if (!isLoading && (!isAuthenticated || !isAdmin)) {
    redirect("/");
  }
  
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