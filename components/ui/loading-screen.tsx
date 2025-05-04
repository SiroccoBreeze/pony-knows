"use client";

import { Loader2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface LoadingScreenProps {
  /**
   * 加载中的消息
   */
  message?: string;
  
  /**
   * 加载中的子消息（显示在主消息下方的次要说明）
   */
  subMessage?: string;
  
  /**
   * 自定义加载图标
   */
  icon?: ReactNode;
  
  /**
   * 是否全屏显示
   */
  fullScreen?: boolean;
  
  /**
   * 图标大小
   */
  iconSize?: number;
  
  /**
   * 容器样式
   */
  className?: string;
}

/**
 * 通用加载页面组件
 * 可以全屏显示或局部显示，支持自定义消息和图标
 */
export function LoadingScreen({
  message = "正在加载",
  subMessage,
  icon,
  fullScreen = true,
  iconSize = 24,
  className
}: LoadingScreenProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center bg-background/80 backdrop-blur-sm",
        fullScreen ? "fixed inset-0 z-50" : "w-full h-full min-h-[200px]",
        className
      )}
    >
      <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-border/40 max-w-sm">
        <div className="relative mx-auto mb-5">
          {icon ? (
            <div className="mx-auto">{icon}</div>
          ) : (
            <div className="relative">
              <div 
                className={`h-${iconSize} w-${iconSize} animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto`} 
                style={{ width: iconSize, height: iconSize }}
              ></div>
              <Loader2 
                className="text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                size={iconSize/2}
              />
            </div>
          )}
        </div>
        
        {message && (
          <h3 className="text-lg font-medium mb-1">{message}</h3>
        )}
        
        {subMessage && (
          <p className="text-sm text-muted-foreground">{subMessage}</p>
        )}
      </div>
    </div>
  );
}

/**
 * 使用特定图标的加载页面
 */
export function IconLoadingScreen({ 
  icon, 
  ...props 
}: LoadingScreenProps & { icon: LucideIcon }) {
  const Icon = icon;
  return (
    <LoadingScreen
      {...props}
      icon={
        <div className="relative">
          <div 
            className="animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto" 
            style={{ width: props.iconSize || 24, height: props.iconSize || 24 }}
          ></div>
          <Icon 
            className="text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
            size={(props.iconSize || 24)/2}
          />
        </div>
      }
    />
  );
} 