"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { notFound } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
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
  
  // 检查用户是否有权访问服务页面
  useEffect(() => {
    // 避免重复检查
    if (hasChecked) return;
    
    // 如果权限仍在加载中，等待
    if (isLoading) return;
    
    // 确保权限已加载完成，使用小延迟
    permissionCheckTimer.current = setTimeout(() => {
      // 设置为已检查
      setHasChecked(true);
      
      // 检查用户是否有任一服务相关权限 - 使用字符串形式比较
      const hasServiceAccess = permissions.includes("view_services");
      const hasDatabaseAccess = permissions.includes("access_database");
      const hasMinioAccess = permissions.includes("access_minio");
      const hasFileDownloadAccess = permissions.includes("access_file_downloads");
      
      // 任一服务权限即可访问服务页面
      const hasAnyServicePermission = hasServiceAccess || hasDatabaseAccess || 
                                     hasMinioAccess || hasFileDownloadAccess;
      
      console.log("[ServicesLayout] 服务权限检查(延迟执行):", {
        hasAccess: hasAnyServicePermission,
        permissions: permissions,
        permissionsCount: permissions.length
      });
      
      // 用户没有权限访问服务页面，显示404页面
      if (!hasAnyServicePermission) {
        console.log("[ServicesLayout] 用户没有服务页面访问权限");
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
  
  // 渲染服务页面内容
  return <>{children}</>;
} 