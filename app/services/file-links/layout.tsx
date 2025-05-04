"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { UserPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

export default function FileLinksLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthPermissions();
  const [showContent, setShowContent] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  // 检查用户是否有权访问资源下载页面
  useEffect(() => {
    // 如果权限还在加载中，等待加载完成
    if (isLoading) return;
    
    let isMounted = true; // 用于防止组件卸载后设置状态
    
    // 实时检查API权限，确保使用最新的权限状态
    async function checkApiPermission() {
      try {
        setIsChecking(true);
        const response = await fetch('/api/auth/debug');
        
        // 如果组件已卸载或正在卸载，不要继续
        if (!isMounted) return;
        
        if (!response.ok) {
          console.log("[FileLinksLayout] 获取API权限失败");
          notFound();
          return;
        }
        
        const data = await response.json();
        const apiPermissions = data.permissions || [];
        
        // 检查API返回的权限中是否包含资源下载权限
        if (apiPermissions.includes(UserPermission.ACCESS_FILE_DOWNLOADS)) {
          console.log("[FileLinksLayout] API权限验证通过，允许访问资源下载");
          setShowContent(true);
        } else {
          console.log("[FileLinksLayout] 用户没有资源下载页面访问权限");
          notFound();
        }
      } catch (error) {
        console.error("[FileLinksLayout] 权限检查错误:", error);
        if (isMounted) {
          notFound();
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }
    
    // 只在组件首次挂载时检查权限
    checkApiPermission();
    
    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [isLoading]); // 只依赖isLoading，不依赖其他会在渲染时变化的值
  
  // 在加载状态或权限检查中显示加载界面
  if (isLoading || isChecking || !showContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">正在加载资源下载页面...</p>
        </div>
      </div>
    );
  }
  
  // 渲染资源下载页面内容
  return <>{children}</>;
} 