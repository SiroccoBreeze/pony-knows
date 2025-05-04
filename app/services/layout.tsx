"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const { hasPermission, isLoading } = useAuthPermissions();
  const [showContent, setShowContent] = useState(false);
  
  // 检查用户是否有权访问服务页面
  useEffect(() => {
    // 如果权限还在加载中，等待加载完成
    if (isLoading) return;
    
    // 检查用户是否有服务访问权限
    if (hasPermission(Permission.ACCESS_SERVICES)) {
      setShowContent(true);
    } else {
      // 用户没有权限访问服务页面，显示404页面
      console.log("[ServicesLayout] 用户没有服务页面访问权限");
      notFound();
    }
  }, [hasPermission, isLoading]);
  
  // 在加载状态或未确认权限时显示加载界面
  if (isLoading || !showContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">正在加载服务页面...</p>
        </div>
      </div>
    );
  }
  
  // 渲染服务页面内容
  return <>{children}</>;
} 