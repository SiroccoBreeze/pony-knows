"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { notFound } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useLoader } from "@/contexts/loader-context";

export default function MinioLayout({ children }: { children: React.ReactNode }) {
  const { permissions, isLoading: isPermissionsLoading } = useAuthPermissions();
  const [hasChecked, setHasChecked] = useState(false);
  const permissionCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const { setLoading, setMessage } = useLoader();
  
  // 设置全局加载状态
  useEffect(() => {
    if (isPermissionsLoading) {
      setLoading(true);
      setMessage("MinIO权限验证中...");
    } else if (hasChecked) {
      setLoading(false);
      setMessage(null);
    }
    
    return () => {
      setLoading(false);
      setMessage(null);
    };
  }, [isPermissionsLoading, hasChecked, setLoading, setMessage]);
  
  // 确保组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (permissionCheckTimer.current) {
        clearTimeout(permissionCheckTimer.current);
      }
    };
  }, []);
  
  // 检查用户是否有权访问MinIO页面
  useEffect(() => {
    // 避免重复检查
    if (hasChecked) return;
    
    // 如果权限仍在加载中，等待
    if (isPermissionsLoading) return;
    
    // 确保权限已加载完成，使用小延迟
    permissionCheckTimer.current = setTimeout(() => {
      // 设置为已检查
      setHasChecked(true);
      
      // 直接使用字符串形式检查权限
      const hasMinioAccess = permissions.includes("access_minio");
      
      console.log("[MinioLayout] MinIO权限检查(延迟执行):", {
        hasAccess: hasMinioAccess,
        expectedPermission: "access_minio", 
        permissions: permissions,
        permissionsCount: permissions.length
      });
      
      // 用户没有权限访问MinIO页面，显示404页面
      if (!hasMinioAccess) {
        console.log("[MinioLayout] 用户没有MinIO访问权限");
        notFound();
      }
    }, 500); // 500ms延迟，确保权限已完全同步
  }, [permissions, hasChecked, isPermissionsLoading]);
  
  // 直接渲染子组件，全局加载状态会自动处理加载UI
  return <>{children}</>;
} 