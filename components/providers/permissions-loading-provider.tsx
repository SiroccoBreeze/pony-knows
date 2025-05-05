"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useEffect, useState } from "react";
import { useLoadingStore } from "@/store/use-loading-store";
import { Shield } from "lucide-react";
import { LoadingScreen } from "../ui/loading-screen";

interface PermissionsLoadingProviderProps {
  children: React.ReactNode;
}

/**
 * 权限加载提供者
 * 确保权限完全加载后再显示内容
 */
export function PermissionsLoadingProvider({ children }: PermissionsLoadingProviderProps) {
  const { isLoading: isPermissionsLoading, permissions } = useAuthPermissions();
  const [isReady, setIsReady] = useState(false);
  const { startLoading, stopLoading } = useLoadingStore();
  
  // 监听权限加载状态
  useEffect(() => {
    if (isPermissionsLoading) {
      // 权限加载中，显示全局加载状态
      startLoading("应用初始化中", "正在加载用户权限...");
      setIsReady(false);
    } else {
      // 权限加载完成
      console.log("[权限提供者] 权限加载完成，权限总数:", permissions.length);
      stopLoading();
      
      // 延迟一小段时间再显示内容，确保加载状态过渡平滑
      setTimeout(() => {
        setIsReady(true);
      }, 50);
    }
  }, [isPermissionsLoading, permissions, startLoading, stopLoading]);
  
  // 权限尚未就绪时，显示加载状态
  if (!isReady) {
    return (
      <LoadingScreen 
        message="应用初始化中" 
        subMessage="正在加载用户权限..."
        fullScreen={true}
        iconSize={36}
        icon={
          <div className="relative">
            <div className="h-36 w-36 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          </div>
        }
      />
    );
  }
  
  // 权限加载完成，渲染子组件
  return <>{children}</>;
} 