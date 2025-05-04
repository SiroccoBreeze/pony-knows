"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { notFound } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { permissions, isLoading } = useAuthPermissions();
  const [hasChecked, setHasChecked] = useState(false);
  const permissionCheckTimer = useRef<NodeJS.Timeout | null>(null);
  
  // 确保组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (permissionCheckTimer.current) {
        clearTimeout(permissionCheckTimer.current);
      }
    };
  }, []);
  
  // 检查用户是否有权访问论坛
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
      const hasForumPermission = permissions.includes("view_forum");
      
      console.log("[ForumLayout] 论坛权限检查(延迟执行):", {
        hasAccess: hasForumPermission,
        expectedPermission: "view_forum", 
        permissions: permissions,
        permissionsCount: permissions.length
      });
      
      // 用户没有权限访问论坛，显示404页面
      if (!hasForumPermission) {
        console.log("[ForumLayout] 用户没有论坛访问权限");
        notFound();
      }
    }, 500); // 500ms延迟，确保权限已完全同步
  }, [permissions, hasChecked, isLoading]);
  
  // 权限检查完成前显示简单的加载指示
  if (!hasChecked) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">权限验证中...</p>
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
  );
} 