"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { UserPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { hasUserPermission, isLoading } = useAuthPermissions();
  const [showContent, setShowContent] = useState(false);
  
  // 检查用户是否有权访问论坛
  useEffect(() => {
    // 如果权限还在加载中，等待加载完成
    if (isLoading) return;
    
    // 检查用户是否有论坛访问权限
    if (hasUserPermission(UserPermission.VIEW_FORUM)) {
      setShowContent(true);
    } else {
      // 用户没有权限访问论坛，显示404页面
      console.log("[ForumLayout] 用户没有论坛访问权限");
      notFound();
    }
  }, [hasUserPermission, isLoading]);
  
  // 在加载状态或未确认权限时显示加载界面
  if (isLoading || !showContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">正在加载论坛...</p>
        </div>
      </div>
    );
  }
  
  // 渲染论坛内容
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
} 