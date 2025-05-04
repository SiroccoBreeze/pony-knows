"use client";

import { useLoadingStore } from "@/store/use-loading-store";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LoadingProviderProps {
  children: React.ReactNode;
}

/**
 * 全局加载状态提供者组件
 * 应放置在应用根部，用于显示全局加载状态
 */
export function LoadingProvider({ children }: LoadingProviderProps) {
  const { isLoading, message, subMessage, stopLoading } = useLoadingStore();
  
  // 监听路由变化或页面刷新，确保加载状态被正确重置
  useEffect(() => {
    // 页面加载完成后自动关闭加载状态
    window.addEventListener('load', stopLoading);
    
    // 页面卸载前可以显示加载状态（可选）
    window.addEventListener('beforeunload', () => {
      useLoadingStore.getState().startLoading("页面刷新中", "请稍候...");
    });
    
    return () => {
      window.removeEventListener('load', stopLoading);
      window.removeEventListener('beforeunload', () => {});
    };
  }, [stopLoading]);
  
  // 自定义加载图标
  const loadingIcon = (
    <div className="relative">
      <div 
        className="h-36 w-36 animate-spin rounded-full border-4 border-primary/30 border-t-primary"
      ></div>
      <Loader2 
        className="text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
        size={18}
      />
    </div>
  );
  
  return (
    <>
      {children}
      
      {isLoading && (
        <LoadingScreen 
          message={message} 
          subMessage={subMessage}
          fullScreen={true}
          iconSize={36}
          icon={loadingIcon}
        />
      )}
    </>
  );
} 